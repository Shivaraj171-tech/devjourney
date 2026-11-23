"""Lab 17 reference solution: joint-space vs task-space trajectories on the UR5e."""

from __future__ import annotations

import numpy as np

from labs.manipulators.lab04_quaternions.solution import matrix_to_quat, quat_slerp, quat_to_matrix
from labs.manipulators.lab05_transforms.solution import make_transform
from labs.manipulators.lab06_dh_fk.solution import fk_dh
from labs.manipulators.lab07_poe.solution import body_screws, screws_from_dh
from labs.manipulators.lab14_dls_ik.solution import ik_lm
from labs.manipulators.lab16_time_scaling.solution import (
    quintic_scaling, trapezoid_profile, trapezoid_sample,
)
from labs.manipulators.toolbox.robots import UR5E_DH

M_UR5E, S_UR5E = screws_from_dh(UR5E_DH)
B_UR5E = body_screws(M_UR5E, S_UR5E)


def joint_trajectory(q0, q1, T, ts):
    """Straight line in joint space with quintic timing: q(t) = q0 + s(t) (q1 - q0).
    Returns (Q, Qd, Qdd), each (len(ts), n)."""
    q0, q1 = np.asarray(q0, dtype=float), np.asarray(q1, dtype=float)
    S = np.array([quintic_scaling(t, T) for t in ts])
    D = q1 - q0
    return q0 + S[:, :1] * D, S[:, 1:2] * D, S[:, 2:3] * D


def sync_trapezoid(q0, q1, vmax, amax):
    """(T, t_a, vs, as): one trapezoid for the path parameter s in [0, 1] shared by all joints.

    Joint j moves D_j s(t), so its speed is |D_j| s'(t): s' <= vmax_j / |D_j| for every j, i.e.
    vs = min_j vmax_j / |D_j| (likewise as). The slowest joint decides; all arrive together.
    """
    D = np.abs(np.asarray(q1, dtype=float) - np.asarray(q0, dtype=float))
    moving = D > 1e-12
    vs = float(np.min(np.asarray(vmax, dtype=float)[moving] / D[moving]))
    as_ = float(np.min(np.asarray(amax, dtype=float)[moving] / D[moving]))
    T, ta, _ = trapezoid_profile(1.0, vs, as_)
    return T, ta, vs, as_


def trapezoid_joint_trajectory(q0, q1, vmax, amax, ts):
    """Minimum-time synchronised trapezoid along the joint-space line. Returns (Q, Qd, Qdd)."""
    q0, q1 = np.asarray(q0, dtype=float), np.asarray(q1, dtype=float)
    _, _, vs, as_ = sync_trapezoid(q0, q1, vmax, amax)
    S = np.array([trapezoid_sample(t, 1.0, vs, as_) for t in ts])
    D = q1 - q0
    return q0 + S[:, :1] * D, S[:, 1:2] * D, S[:, 2:3] * D


def cartesian_poses(T0, T1, s_values) -> np.ndarray:
    """Poses along the straight line p0 -> p1 with orientation slerp(R0, R1, s). (N, 4, 4)."""
    T0, T1 = np.asarray(T0, dtype=float), np.asarray(T1, dtype=float)
    q0, q1 = matrix_to_quat(T0[:3, :3]), matrix_to_quat(T1[:3, :3])
    out = []
    for s in s_values:
        p = T0[:3, 3] + s * (T1[:3, 3] - T0[:3, 3])
        out.append(make_transform(quat_to_matrix(quat_slerp(q0, q1, s)), p))
    return np.array(out)


def cartesian_trajectory(T0, T1, T, ts, q_start):
    """Task-space trajectory: quintic s(t) along cartesian_poses, converted to joints by IK
    (ik_lm) warm-started from the previous sample. Returns (Q (N, 6), ok)."""
    s = [quintic_scaling(t, T)[0] for t in ts]
    q = np.asarray(q_start, dtype=float)
    Q, ok = [], True
    for T_d in cartesian_poses(T0, T1, s):
        q, success, _ = ik_lm(M_UR5E, B_UR5E, T_d, q)
        ok &= success
        Q.append(q)
    return np.unwrap(np.array(Q), axis=0), bool(ok)


def finite_differences(Q, dt):
    """(Qd, Qdd, Qddd) by repeated np.gradient (central differences inside, one-sided at the ends)."""
    Qd = np.gradient(Q, dt, axis=0)
    Qdd = np.gradient(Qd, dt, axis=0)
    return Qd, Qdd, np.gradient(Qdd, dt, axis=0)


def limit_check(Qd, Qdd, vmax, amax) -> dict:
    """Worst ratio of |qd| / vmax and |qdd| / amax over time and joints; ok if both <= 1."""
    v = float(np.max(np.abs(Qd) / np.asarray(vmax)))
    a = float(np.max(np.abs(Qdd) / np.asarray(amax)))
    return {"vel_ratio": v, "acc_ratio": a, "ok": bool(v <= 1.0 and a <= 1.0)}


def ee_positions(Q) -> np.ndarray:
    """(N, 3) end-effector positions by DH FK."""
    return np.array([fk_dh(UR5E_DH, q)[:3, 3] for q in Q])


def track_in_mujoco(sim, Q, dt):
    """Send the joint trajectory to a sim (servo set-point moves exactly through Q[k]):
    sim.step((Q[k+1] - Q[k]) / dt, dt). Returns (P (N, 3), Qm (N, n)) measured at every sample."""
    P, Qm = [sim.ee_pose()[:3, 3].copy()], [sim.q]
    for k in range(len(Q) - 1):
        sim.step((Q[k + 1] - Q[k]) / dt, dt)
        P.append(sim.ee_pose()[:3, 3].copy())
        Qm.append(sim.q)
    return np.array(P), np.array(Qm)
