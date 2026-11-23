"""Lab 18 reference solution: Lagrangian dynamics of the planar 2-link arm, checked against MuJoCo.

The arm (toolbox.robots.PLANAR2R_DYN) moves in the vertical x-z plane: q measured from +x towards
+z, gravity g along -z. Parameters: l1, l2 (link lengths), lc1, lc2 (joint-to-COM distances),
m1, m2, I1, I2 (masses, moments of inertia about each COM for the swing axis).
"""

from __future__ import annotations

import numpy as np


def com_positions(q, p):
    """(x, z) of the two centres of mass."""
    q1, q2 = q
    c1 = p["lc1"] * np.array([np.cos(q1), np.sin(q1)])
    c2 = (p["l1"] * np.array([np.cos(q1), np.sin(q1)])
          + p["lc2"] * np.array([np.cos(q1 + q2), np.sin(q1 + q2)]))
    return c1, c2


def com_jacobians(q, p):
    """(Jv1, Jv2): 2x2 Jacobians d(com_i)/dq, so com_i velocity = Jv_i qd."""
    q1, q2 = q
    s1, c1, s12, c12 = np.sin(q1), np.cos(q1), np.sin(q1 + q2), np.cos(q1 + q2)
    Jv1 = np.array([[-p["lc1"] * s1, 0.0], [p["lc1"] * c1, 0.0]])
    Jv2 = np.array([[-p["l1"] * s1 - p["lc2"] * s12, -p["lc2"] * s12],
                    [p["l1"] * c1 + p["lc2"] * c12, p["lc2"] * c12]])
    return Jv1, Jv2


def mass_matrix_from_jacobians(q, p) -> np.ndarray:
    """M = sum_i m_i Jv_i^T Jv_i + I_i Jw_i^T Jw_i with Jw1 = [1, 0], Jw2 = [1, 1]."""
    Jv1, Jv2 = com_jacobians(q, p)
    Jw1, Jw2 = np.array([[1.0, 0.0]]), np.array([[1.0, 1.0]])
    return (p["m1"] * Jv1.T @ Jv1 + p["I1"] * Jw1.T @ Jw1
            + p["m2"] * Jv2.T @ Jv2 + p["I2"] * Jw2.T @ Jw2)


def planar2r_mass_matrix(q, p) -> np.ndarray:
    """Closed form M(q) (README step 3)."""
    c2 = np.cos(q[1])
    m1, m2, l1, lc1, lc2, I1, I2 = (p[k] for k in ("m1", "m2", "l1", "lc1", "lc2", "I1", "I2"))
    m11 = m1 * lc1**2 + I1 + m2 * (l1**2 + lc2**2 + 2 * l1 * lc2 * c2) + I2
    m12 = m2 * (lc2**2 + l1 * lc2 * c2) + I2
    m22 = m2 * lc2**2 + I2
    return np.array([[m11, m12], [m12, m22]])


def planar2r_coriolis_matrix(q, qd, p) -> np.ndarray:
    """C(q, qd) from the Christoffel symbols: h = -m2 l1 lc2 sin q2,
    C = [[h qd2, h (qd1 + qd2)], [-h qd1, 0]]."""
    h = -p["m2"] * p["l1"] * p["lc2"] * np.sin(q[1])
    return np.array([[h * qd[1], h * (qd[0] + qd[1])], [-h * qd[0], 0.0]])


def planar2r_gravity(q, p) -> np.ndarray:
    """g(q) = dP/dq."""
    g = p["g"]
    c1, c12 = np.cos(q[0]), np.cos(q[0] + q[1])
    return np.array([(p["m1"] * p["lc1"] + p["m2"] * p["l1"]) * g * c1 + p["m2"] * p["lc2"] * g * c12,
                     p["m2"] * p["lc2"] * g * c12])


def planar2r_inverse_dynamics(q, qd, qdd, p) -> np.ndarray:
    """tau = M qdd + C qd + g."""
    q, qd, qdd = (np.asarray(x, dtype=float) for x in (q, qd, qdd))
    return (planar2r_mass_matrix(q, p) @ qdd + planar2r_coriolis_matrix(q, qd, p) @ qd
            + planar2r_gravity(q, p))


def planar2r_energy(q, qd, p):
    """(kinetic, potential) energy; potential is zero at z = 0 (the shoulder height)."""
    qd = np.asarray(qd, dtype=float)
    c1, c2 = com_positions(q, p)
    return (0.5 * qd @ planar2r_mass_matrix(q, p) @ qd,
            p["g"] * (p["m1"] * c1[1] + p["m2"] * c2[1]))


def mujoco_dynamics(model, data, q, qd):
    """(M, bias) from MuJoCo: dense mass matrix (mj_fullM) and qfrc_bias = C qd + g."""
    import mujoco
    data.qpos[:] = q
    data.qvel[:] = qd
    mujoco.mj_forward(model, data)
    M = np.zeros((model.nv, model.nv))
    mujoco.mj_fullM(model, data, M)
    return M, data.qfrc_bias.copy()
