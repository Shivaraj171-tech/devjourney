"""Lab 19 reference solution: recursive Newton-Euler inverse dynamics (twist form, Modern Robotics
sec. 8.3), for any revolute DH arm, verified against MuJoCo's mj_inverse.

Twists are (omega, v), wrenches (m, f): torque first, matching the twist order.
"""

from __future__ import annotations

import numpy as np

from labs.manipulators.lab01_rotations.solution import skew
from labs.manipulators.lab05_transforms.solution import transform_inverse
from labs.manipulators.lab06_dh_fk.solution import fk_dh_frames
from labs.manipulators.lab07_poe.solution import adjoint, exp_se3, screws_from_dh


def ad_twist(V) -> np.ndarray:
    """[ad_V] = [[ [w], 0 ], [ [v], [w] ]]: the Lie bracket, ad_V1 V2 = [V1, V2]."""
    V = np.asarray(V, dtype=float)
    out = np.zeros((6, 6))
    out[:3, :3] = skew(V[:3])
    out[3:, :3] = skew(V[3:])
    out[3:, 3:] = skew(V[:3])
    return out


def spatial_inertia(mass: float, inertia_diag) -> np.ndarray:
    """6x6 G = diag(Ixx, Iyy, Izz, m, m, m) in a principal frame at the COM ((omega, v) order)."""
    return np.diag(np.concatenate([np.asarray(inertia_diag, dtype=float), np.full(3, float(mass))]))


def com_frames(dh, links) -> list:
    """Home (q = 0) poses in the base frame of: the COM frame of each link (DH frame i moved to the
    COM, same orientation) and, last, the end-effector frame (DH frame n). n + 1 transforms."""
    frames = fk_dh_frames(dh, np.zeros(len(dh)))
    homes = []
    for i, (_, com, _) in enumerate(links):
        T = frames[i + 1].copy()
        T[:3, 3] = frames[i + 1][:3, :3] @ np.asarray(com, dtype=float) + frames[i + 1][:3, 3]
        homes.append(T)
    homes.append(frames[-1])
    return homes


def rnea_model(dh, links) -> dict:
    """Everything RNEA needs, computed once:
    "Mlist": M_{i-1,i} home transform of frame i seen from frame i-1 (frame 0 = base), n + 1 of them;
    "Glist": spatial inertias; "Alist": joint i's screw axis in COM frame i, A_i = Ad_{M_i^-1} S_i.
    """
    homes = com_frames(dh, links)
    _, Slist = screws_from_dh(dh)
    Mlist = [homes[0]] + [transform_inverse(homes[i - 1]) @ homes[i] for i in range(1, len(homes))]
    Glist = [spatial_inertia(m, inertia) for m, _, inertia in links]
    Alist = [adjoint(transform_inverse(homes[i])) @ Slist[:, i] for i in range(len(links))]
    return {"Mlist": Mlist, "Glist": Glist, "Alist": Alist}


def rnea(model, q, qd, qdd, gravity=(0.0, 0.0, -9.81), F_tip=None) -> np.ndarray:
    """Joint torques tau = M(q) qdd + C(q, qd) qd + g(q) (+ J_b^T F_tip).

    Forward pass (base -> tip), for i = 1..n:
        T_{i,i-1} = exp(-[A_i] q_i) M_{i-1,i}^-1
        V_i  = Ad_{T_{i,i-1}} V_{i-1} + A_i qd_i
        Vd_i = Ad_{T_{i,i-1}} Vd_{i-1} + ad_{V_i} A_i qd_i + A_i qdd_i,     Vd_0 = (0, -gravity)
    Backward pass (tip -> base), for i = n..1:
        F_i = Ad_{T_{i+1,i}}^T F_{i+1} + G_i Vd_i - ad_{V_i}^T G_i V_i,     F_{n+1} = F_tip
        tau_i = F_i . A_i
    F_tip is the wrench (m, f) the end effector applies to the environment, in the ee frame.
    """
    Ml, Gl, Al = model["Mlist"], model["Glist"], model["Alist"]
    n = len(Al)
    q, qd, qdd = (np.asarray(x, dtype=float) for x in (q, qd, qdd))
    V = np.zeros(6)
    Vd = np.concatenate([np.zeros(3), -np.asarray(gravity, dtype=float)])
    Ts, Vs, Vds = [], [], []
    for i in range(n):
        T = exp_se3(-Al[i], q[i]) @ transform_inverse(Ml[i])
        AdT = adjoint(T)
        V = AdT @ V + Al[i] * qd[i]
        Vd = AdT @ Vd + ad_twist(V) @ Al[i] * qd[i] + Al[i] * qdd[i]
        Ts.append(T)
        Vs.append(V)
        Vds.append(Vd)
    F = np.zeros(6) if F_tip is None else np.asarray(F_tip, dtype=float)
    T_next = transform_inverse(Ml[n])  # T_{n+1,n}: ee frame from the last COM frame
    tau = np.zeros(n)
    for i in range(n - 1, -1, -1):
        F = adjoint(T_next).T @ F + Gl[i] @ Vds[i] - ad_twist(Vs[i]).T @ (Gl[i] @ Vs[i])
        tau[i] = F @ Al[i]
        T_next = Ts[i]
    return tau


def mass_matrix_rnea(model, q) -> np.ndarray:
    """Column j of M(q) = rnea with qd = 0, qdd = e_j, no gravity."""
    n = len(model["Alist"])
    z = np.zeros(n)
    return np.column_stack([rnea(model, q, z, e, gravity=np.zeros(3)) for e in np.eye(n)])


def bias_forces_rnea(model, q, qd, gravity=(0.0, 0.0, -9.81)) -> np.ndarray:
    """C(q, qd) qd + g(q) = rnea with qdd = 0."""
    return rnea(model, q, qd, np.zeros(len(model["Alist"])), gravity)


def gravity_rnea(model, q, gravity=(0.0, 0.0, -9.81)) -> np.ndarray:
    """g(q) = rnea with qd = qdd = 0."""
    z = np.zeros(len(model["Alist"]))
    return rnea(model, q, z, z, gravity)


def mujoco_inverse(mj_model, data, q, qd, qdd) -> np.ndarray:
    """MuJoCo's inverse dynamics: set qpos, qvel, qacc, call mj_inverse, read qfrc_inverse."""
    import mujoco
    data.qpos[:] = q
    data.qvel[:] = qd
    data.qacc[:] = qdd
    mujoco.mj_inverse(mj_model, data)
    return data.qfrc_inverse.copy()
