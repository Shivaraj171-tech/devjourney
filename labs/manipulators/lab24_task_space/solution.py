"""Lab 24 reference solution: task-space control: Jacobian-transpose and operational-space control
to a Cartesian target, with orientation error; the dynamically consistent null space."""

from __future__ import annotations

import numpy as np

from labs.manipulators.lab03_axis_angle.solution import log_so3


def planar2r_fk(q, p) -> np.ndarray:
    """(x, z) of the 2R arm's tip (lab 18 conventions: q from +x towards +z)."""
    q1, q2 = q
    return np.array([p["l1"] * np.cos(q1) + p["l2"] * np.cos(q1 + q2),
                     p["l1"] * np.sin(q1) + p["l2"] * np.sin(q1 + q2)])


def planar2r_jacobian(q, p) -> np.ndarray:
    """2x2 d(tip)/dq."""
    q1, q2 = q
    s1, c1, s12, c12 = np.sin(q1), np.cos(q1), np.sin(q1 + q2), np.cos(q1 + q2)
    return np.array([[-p["l1"] * s1 - p["l2"] * s12, -p["l2"] * s12],
                     [p["l1"] * c1 + p["l2"] * c12, p["l2"] * c12]])


def orientation_error(R, R_d) -> np.ndarray:
    """Rotation vector, in WORLD axes, that turns R into R_d: log(R_d R^T).
    Small errors: R_d ~ (I + [e]) R, so e is the angular displacement still to go."""
    return log_so3(np.asarray(R_d) @ np.asarray(R).T)


def pose_error(T, T_d) -> np.ndarray:
    """6-vector [p_d - p; orientation_error(R, R_d)], ordered like the geometric Jacobian [Jv; Jw]."""
    T, T_d = np.asarray(T), np.asarray(T_d)
    return np.concatenate([T_d[:3, 3] - T[:3, 3], orientation_error(T[:3, :3], T_d[:3, :3])])


def jacobian_transpose_control(J, qd, e, Kp, Kd, g) -> np.ndarray:
    """tau = J^T (Kp e - Kd J qd) + g: a virtual spring-damper at the end effector, mapped to the
    joints by the transpose (the same map as tau = J^T F for a real force)."""
    J = np.asarray(J, dtype=float)
    F = np.asarray(Kp) * np.asarray(e) - np.asarray(Kd) * (J @ np.asarray(qd, dtype=float))
    return J.T @ F + np.asarray(g)


def task_space_inertia(J, M) -> np.ndarray:
    """Lambda = (J M^-1 J^T)^-1: the mass the end effector 'feels' along each task direction."""
    J = np.asarray(J, dtype=float)
    return np.linalg.inv(J @ np.linalg.solve(M, J.T))


def operational_space_control(J, M, qd, e, Kp, Kd, g) -> np.ndarray:
    """tau = J^T Lambda (Kp e - Kd J qd) + g: commands a task ACCELERATION, so every task direction
    responds like the same unit-mass spring-damper (Khatib's operational space formulation, without
    the velocity-product term Lambda Jdot qd and task-space Coriolis, negligible near rest)."""
    J = np.asarray(J, dtype=float)
    a = np.asarray(Kp) * np.asarray(e) - np.asarray(Kd) * (J @ np.asarray(qd, dtype=float))
    return J.T @ (task_space_inertia(J, M) @ a) + np.asarray(g)


def nullspace_projector(J, M) -> np.ndarray:
    """N = I - J^T Jbar^T with the dynamically consistent inverse Jbar = M^-1 J^T Lambda.
    Torques N tau0 cause no task-space acceleration: J M^-1 N tau0 = 0."""
    J = np.asarray(J, dtype=float)
    Jbar = np.linalg.solve(M, J.T) @ task_space_inertia(J, M)
    return np.eye(J.shape[1]) - J.T @ Jbar.T
