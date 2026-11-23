"""Lab 25 reference solution: Cartesian impedance control. The gripper behaves like a spring-damper
around a target; we push it (xfrc_applied), measure its stiffness, then press it on a table."""

from __future__ import annotations

import numpy as np


def as_matrix(K, n: int) -> np.ndarray:
    """Scalar -> K I, vector -> diag(K), matrix -> itself (n x n)."""
    K = np.asarray(K, dtype=float)
    if K.ndim == 0:
        return K * np.eye(n)
    if K.ndim == 1:
        return np.diag(K)
    return K


def impedance_torque(J, qd, x, x0, K, D, g) -> np.ndarray:
    """tau = J^T (K (x0 - x) - D J qd) + g: the hand acts like a spring K (and damper D) tied to the
    rest point x0; gravity is cancelled so the spring is all an outsider feels."""
    J = np.asarray(J, dtype=float)
    n = J.shape[0]
    F = as_matrix(K, n) @ (np.asarray(x0, dtype=float) - np.asarray(x, dtype=float)) \
        - as_matrix(D, n) @ (J @ np.asarray(qd, dtype=float))
    return J.T @ F + np.asarray(g)


def predicted_deflection(K, f) -> np.ndarray:
    """Static displacement x - x0 under an external force f at the hand: K (x0 - x) + f = 0."""
    f = np.asarray(f, dtype=float)
    return np.linalg.solve(as_matrix(K, len(f)), f)


def xfrc_for_point_force(force, point, com) -> np.ndarray:
    """MuJoCo's xfrc_applied row for a force applied at `point` (world frame) on a body whose centre
    of mass is `com`. MuJoCo applies xfrc_applied at the COM and orders it [force; torque] (NOT our
    (m, f) wrench order), so moving the force to `point` adds the torque (point - com) x force."""
    force = np.asarray(force, dtype=float)
    return np.concatenate([force, np.cross(np.asarray(point, dtype=float) - np.asarray(com), force)])


def estimate_stiffness(forces, displacements) -> np.ndarray:
    """Least-squares K from experiments f_k = K d_k: stack F = [f_1 .. f_m], D = [d_1 .. d_m]
    (columns) and solve F = K D, i.e. D^T K^T = F^T."""
    F = np.asarray(forces, dtype=float).T
    Dm = np.asarray(displacements, dtype=float).T
    return np.linalg.lstsq(Dm.T, F.T, rcond=None)[0].T


def contact_normal_force(model, data, geom_a: str, geom_b: str) -> float:
    """Total normal force [N] between two named geoms: sum over data.contact[:data.ncon] of the
    first component of mj_contactForce (normal, in the contact frame) for matching pairs."""
    import mujoco
    a, b = model.geom(geom_a).id, model.geom(geom_b).id
    total, f = 0.0, np.zeros(6)
    for i in range(data.ncon):
        c = data.contact[i]
        if {c.geom1, c.geom2} == {a, b}:
            mujoco.mj_contactForce(model, data, i, f)
            total += f[0]
    return float(total)
