"""Lab 22 reference solution: PD + gravity compensation, and why it is stable (Lyapunov)."""

from __future__ import annotations

import numpy as np

from labs.manipulators.lab19_newton_euler.solution import gravity_rnea, rnea_model
from labs.manipulators.lab21_pd_control.solution import pd_torque


def pd_gravity(q, qd, q_des, Kp, Kd, g_fn) -> np.ndarray:
    """tau = Kp (q_des - q) - Kd qd + g(q): PD plus the torque that cancels gravity right now."""
    return pd_torque(q, qd, q_des, Kp, Kd) + np.asarray(g_fn(np.asarray(q, dtype=float)))


def pd_gravity_desired(q, qd, q_des, Kp, Kd, g_fn) -> np.ndarray:
    """tau = Kp (q_des - q) - Kd qd + g(q_des): a constant feedforward (computable once, offline).
    Same equilibrium; stable if Kp beats the gravity "stiffness" dg/dq."""
    return pd_torque(q, qd, q_des, Kp, Kd) + np.asarray(g_fn(np.asarray(q_des, dtype=float)))


def make_gravity_fn(dh, links, gravity=(0.0, 0.0, -9.81)):
    """g(q) for any revolute DH arm via lab 19's RNEA (qd = qdd = 0). Build the model once."""
    model = rnea_model(dh, links)
    return lambda q: gravity_rnea(model, q, gravity)


def lyapunov(q, qd, q_des, Kp, mass_fn) -> float:
    """V = 1/2 qd^T M(q) qd + 1/2 e^T Kp e with e = q_des - q: kinetic energy plus the energy
    stored in the virtual springs (Kp a scalar or per-joint array)."""
    q, qd = np.asarray(q, dtype=float), np.asarray(qd, dtype=float)
    e = np.asarray(q_des, dtype=float) - q
    return float(0.5 * qd @ mass_fn(q) @ qd + 0.5 * e @ (np.asarray(Kp) * e))


def lyapunov_rate(qd, Kd) -> float:
    """dV/dt along the closed loop = -qd^T Kd qd: only the dampers remove energy."""
    qd = np.asarray(qd, dtype=float)
    return float(-qd @ (np.asarray(Kd) * qd))


def model_error_offset(q_des, Kp, g_true, g_model, iters: int = 100) -> np.ndarray:
    """Rest position when the compensation uses a wrong model: Kp (q_des - q) = g_true(q) - g_model(q).
    Fixed-point iteration from q_des, as in lab 21."""
    q_des = np.asarray(q_des, dtype=float)
    q = q_des.copy()
    for _ in range(iters):
        q = q_des - (np.asarray(g_true(q)) - np.asarray(g_model(q))) / np.asarray(Kp, dtype=float)
    return q
