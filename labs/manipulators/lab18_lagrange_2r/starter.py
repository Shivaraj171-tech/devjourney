"""Lab 18: Lagrangian dynamics of the planar 2-link arm, checked against MuJoCo.

p is a dict like toolbox.robots.PLANAR2R_DYN with keys l1, l2, lc1, lc2, m1, m2, I1, I2, g.
The arm moves in the vertical x-z plane (q from +x towards +z, gravity along -z).
Points in that plane are 2-vectors (x, z).
"""

from __future__ import annotations

import numpy as np


def com_positions(q, p):
    """(c1, c2): the (x, z) positions of the two centres of mass (README step 1)."""
    # TODO
    raise NotImplementedError("COM positions")


def com_jacobians(q, p):
    """(Jv1, Jv2): 2x2 Jacobians of the COM positions (README step 1)."""
    # TODO
    raise NotImplementedError("COM Jacobians")


def mass_matrix_from_jacobians(q, p) -> np.ndarray:
    """sum_i m_i Jv_i^T Jv_i + I_i Jw_i^T Jw_i with Jw1 = [[1, 0]], Jw2 = [[1, 1]] (step 2)."""
    # TODO
    raise NotImplementedError("M from Jacobians")


def planar2r_mass_matrix(q, p) -> np.ndarray:
    """Closed-form 2x2 M(q) (README step 3)."""
    # TODO
    raise NotImplementedError("closed-form M")


def planar2r_coriolis_matrix(q, qd, p) -> np.ndarray:
    """2x2 Christoffel C(q, qd) (README step 5), h = -m2 l1 lc2 sin q2."""
    # TODO
    raise NotImplementedError("Coriolis matrix")


def planar2r_gravity(q, p) -> np.ndarray:
    """g(q) = dP/dq (README step 4)."""
    # TODO
    raise NotImplementedError("gravity torques")


def planar2r_inverse_dynamics(q, qd, qdd, p) -> np.ndarray:
    """tau = M qdd + C qd + g."""
    # TODO
    raise NotImplementedError("inverse dynamics")


def planar2r_energy(q, qd, p):
    """(kinetic, potential): K = 1/2 qd^T M qd, P = g (m1 z_c1 + m2 z_c2), zero at z = 0."""
    # TODO
    raise NotImplementedError("energy")


def mujoco_dynamics(model, data, q, qd):
    """(M, bias) from MuJoCo: set qpos, qvel; mj_forward; mj_fullM(model, data, M) into a dense
    (nv, nv) array; bias = a COPY of data.qfrc_bias. Import mujoco inside the function."""
    # TODO: README step 7
    raise NotImplementedError("ask MuJoCo")
