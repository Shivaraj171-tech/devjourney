"""Lab 19: recursive Newton-Euler inverse dynamics (twist form), verified against mj_inverse.

Twists (omega, v); wrenches (m, f). links = tuple of (mass, com in DH frame i, (Ixx, Iyy, Izz)),
see toolbox/robots.py. Toolbox: skew, adjoint, exp_se3, transform_inverse, fk_dh_frames,
screws_from_dh.
"""

from __future__ import annotations

import numpy as np

from labs.manipulators.toolbox import (  # noqa: F401
    adjoint, exp_se3, fk_dh_frames, screws_from_dh, skew, transform_inverse,
)


def ad_twist(V) -> np.ndarray:
    """6x6 [ad_V] = [[ [w], 0 ], [ [v], [w] ]] (README step 3)."""
    # TODO
    raise NotImplementedError("ad of a twist")


def spatial_inertia(mass: float, inertia_diag) -> np.ndarray:
    """6x6 diag(Ixx, Iyy, Izz, m, m, m)."""
    # TODO
    raise NotImplementedError("spatial inertia")


def com_frames(dh, links) -> list:
    """n + 1 home poses (base frame): COM frame of each link (DH frame i at q = 0, origin moved to
    the COM: p = R_i com + p_i), then the end-effector frame (DH frame n). README step 0."""
    # TODO
    raise NotImplementedError("home COM frames")


def rnea_model(dh, links) -> dict:
    """{"Mlist": [M_01, M_12, ..., M_n,n+1] relative home transforms (M_{i-1,i} = M_{i-1}^-1 M_i,
    M_0 = I), "Glist": [G_i], "Alist": [A_i = Ad_{M_i^-1} S_i]} with S from screws_from_dh."""
    # TODO
    raise NotImplementedError("precompute the RNEA model")


def rnea(model, q, qd, qdd, gravity=(0.0, 0.0, -9.81), F_tip=None) -> np.ndarray:
    """Joint torques by the two passes of README steps 1-5. F_tip (6,) is the wrench the end
    effector applies to the world, in the ee frame (None = zero)."""
    # TODO: forward pass (keep T_{i,i-1}, V_i, Vd_i), then backward pass
    raise NotImplementedError("recursive Newton-Euler")


def mass_matrix_rnea(model, q) -> np.ndarray:
    """M(q), column j = rnea(model, q, 0, e_j, gravity=0)."""
    # TODO: README step 6
    raise NotImplementedError("mass matrix from RNEA")


def bias_forces_rnea(model, q, qd, gravity=(0.0, 0.0, -9.81)) -> np.ndarray:
    """C(q, qd) qd + g(q)."""
    # TODO
    raise NotImplementedError("bias forces")


def gravity_rnea(model, q, gravity=(0.0, 0.0, -9.81)) -> np.ndarray:
    """g(q)."""
    # TODO
    raise NotImplementedError("gravity torques")


def mujoco_inverse(mj_model, data, q, qd, qdd) -> np.ndarray:
    """Set qpos, qvel, qacc; mujoco.mj_inverse(mj_model, data); return a copy of qfrc_inverse.
    Import mujoco inside the function."""
    # TODO: README step 7
    raise NotImplementedError("MuJoCo inverse dynamics")
