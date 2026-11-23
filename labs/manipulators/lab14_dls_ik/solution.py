"""Lab 14 reference solution: damped least squares / Levenberg-Marquardt IK, joint limits,
and choosing among multiple solutions."""

from __future__ import annotations

import numpy as np

from labs.manipulators.lab07_poe.solution import fk_body
from labs.manipulators.lab09_jacobian.solution import jacobian_body
from labs.manipulators.lab12_analytic_ik.solution import wrap_to_pi
from labs.manipulators.lab13_newton_ik.solution import body_twist_error, error_norms


def dls_step(J, error, lam: float) -> np.ndarray:
    """argmin |J dq - e|^2 + lam^2 |dq|^2  =  J^T (J J^T + lam^2 I)^-1 e."""
    J = np.asarray(J, dtype=float)
    m = J.shape[0]
    return J.T @ np.linalg.solve(J @ J.T + lam**2 * np.eye(m), np.asarray(error, dtype=float))


def clamp_to_limits(q, q_min, q_max) -> np.ndarray:
    """Wrap to (-pi, pi], then clip into [q_min, q_max] (projection onto the box)."""
    q = wrap_to_pi(q)
    if q_min is None:
        return q
    return np.clip(q, q_min, q_max)


def ik_lm(M, Blist, T_sd, q0, q_min=None, q_max=None, lam0: float = 1e-2,
          eomg: float = 1e-9, ev: float = 1e-9, max_iters: int = 100):
    """Levenberg-Marquardt IK on the body twist error, with box joint limits.

    cost = |V_b|^2. Each iteration tries q_try = clamp(q + dls_step(J_b, V_b, lam)).
    If the cost went down: accept, lam /= 10 (more Newton-like). Otherwise: reject, lam *= 10
    (shorter, more gradient-like step). Stop on success, or when lam > 1e6 (stuck).

    Returns (q, success, info) with info = {"iterations", "costs" (accepted, non-increasing),
    "lambdas" (lam used at each iteration)}.
    """
    q = clamp_to_limits(q0, q_min, q_max)
    lam = lam0
    V = body_twist_error(fk_body(M, Blist, q), T_sd)
    cost = float(V @ V)
    costs, lambdas = [cost], []
    for it in range(1, max_iters + 1):
        w, v = error_norms(V)
        if w < eomg and v < ev:
            return q, True, {"iterations": it - 1, "costs": costs, "lambdas": lambdas}
        lambdas.append(lam)
        q_try = clamp_to_limits(q + dls_step(jacobian_body(Blist, q), V, lam), q_min, q_max)
        V_try = body_twist_error(fk_body(M, Blist, q_try), T_sd)
        cost_try = float(V_try @ V_try)
        if cost_try < cost:
            q, V, cost = q_try, V_try, cost_try
            costs.append(cost)
            lam = max(lam / 10, 1e-12)
        else:
            lam *= 10
            if lam > 1e6:
                break
    w, v = error_norms(V)
    return q, bool(w < eomg and v < ev), {"iterations": len(lambdas), "costs": costs,
                                           "lambdas": lambdas}


def within_limits(q, q_min, q_max, tol: float = 1e-9) -> bool:
    q = np.asarray(q, dtype=float)
    return bool(np.all(q >= np.asarray(q_min) - tol) and np.all(q <= np.asarray(q_max) + tol))


def distinct_solutions(solutions, tol: float = 1e-4) -> list:
    """Drop duplicates: two solutions are the same if every wrapped joint difference < tol."""
    out = []
    for q in solutions:
        q = wrap_to_pi(q)
        if all(np.abs(wrap_to_pi(q - p)).max() >= tol for p in out):
            out.append(q)
    return out


def multi_start_ik(M, Blist, T_sd, seeds, q_min=None, q_max=None) -> list:
    """Run ik_lm from every seed; return the distinct successful solutions."""
    sols = []
    for seed in seeds:
        q, ok, _ = ik_lm(M, Blist, T_sd, seed, q_min, q_max)
        if ok:
            sols.append(q)
    return distinct_solutions(sols)


def select_solution(candidates, q_current, q_min=None, q_max=None, weights=None):
    """The candidate within limits that is closest to q_current in the weighted joint distance
    sqrt(sum w_i (q_i - qc_i)^2). The difference is NOT wrapped: with limits, a joint cannot
    take the short way through +-pi, so the plain difference is the real travel.
    Returns None if no candidate is within limits."""
    qc = np.asarray(q_current, dtype=float)
    w = np.ones_like(qc) if weights is None else np.asarray(weights, dtype=float)
    best, best_d = None, np.inf
    for q in candidates:
        q = np.asarray(q, dtype=float)
        if q_min is not None and not within_limits(q, q_min, q_max):
            continue
        d = float(np.sqrt(np.sum(w * (q - qc) ** 2)))
        if d < best_d:
            best, best_d = q, d
    return best
