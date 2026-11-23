"""Lab 13 reference solution: numerical IK by Newton-Raphson on the body twist error."""

from __future__ import annotations

import numpy as np

from labs.manipulators.lab05_transforms.solution import transform_inverse
from labs.manipulators.lab07_poe.solution import fk_body, log_se3
from labs.manipulators.lab09_jacobian.solution import jacobian_body


def body_twist_error(T_sb, T_sd) -> np.ndarray:
    """V_b = log(T_sb^-1 T_sd): the body twist (omega, v) that carries the current end-effector
    frame onto the desired one in unit time, expressed in the current end-effector frame."""
    return log_se3(transform_inverse(T_sb) @ np.asarray(T_sd, dtype=float))


def error_norms(V_b):
    """(|omega| [rad], |v| [m]) of a body twist error."""
    V_b = np.asarray(V_b, dtype=float)
    return float(np.linalg.norm(V_b[:3])), float(np.linalg.norm(V_b[3:]))


def newton_step(J, error) -> np.ndarray:
    """dq solving J dq = error in the least-squares, minimum-norm sense (the pseudo-inverse)."""
    return np.linalg.lstsq(np.asarray(J, dtype=float), np.asarray(error, dtype=float),
                           rcond=None)[0]


def ik_newton(M, Blist, T_sd, q0, eomg: float = 1e-9, ev: float = 1e-9, max_iters: int = 30):
    """Newton-Raphson IK (Lynch & Park, Modern Robotics, algorithm in sec. 6.2.2).

    Returns (q, success, history) with history[k] = (|omega|, |v|) of the error at iterate k
    (history[0] is the initial guess). success means both norms are under tolerance.
    """
    q = np.array(q0, dtype=float)
    history = []
    for _ in range(max_iters + 1):
        V_b = body_twist_error(fk_body(M, Blist, q), T_sd)
        history.append(error_norms(V_b))
        if history[-1][0] < eomg and history[-1][1] < ev:
            return q, True, history
        if len(history) > max_iters:
            break
        q = q + newton_step(jacobian_body(Blist, q), V_b)
    return q, False, history


def ik_newton_position(position_fn, jacobian_fn, p_des, q0, tol: float = 1e-10,
                       max_iters: int = 30):
    """Position-only Newton: e = p_des - p(q), q += J_v^+ e. Returns (q, success, errors)."""
    q = np.array(q0, dtype=float)
    p_des = np.asarray(p_des, dtype=float)
    errors = []
    for _ in range(max_iters + 1):
        e = p_des - position_fn(q)
        errors.append(float(np.linalg.norm(e)))
        if errors[-1] < tol:
            return q, True, errors
        if len(errors) > max_iters:
            break
        q = q + newton_step(jacobian_fn(q), e)
    return q, False, errors


def convergence_order(errors) -> np.ndarray:
    """Estimated order p_k = log(e_{k+1}/e_k) / log(e_k/e_{k-1}) for consecutive errors.

    p ~ 1: linear convergence, p ~ 2: quadratic (Newton near a regular solution).
    """
    e = np.asarray(errors, dtype=float)
    return np.log(e[2:] / e[1:-1]) / np.log(e[1:-1] / e[:-2])
