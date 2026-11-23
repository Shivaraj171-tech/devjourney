"""Lab 13: numerical inverse kinematics by Newton-Raphson on the body twist error.

Building blocks from the toolbox: fk_body(M, Blist, q), jacobian_body(Blist, q), log_se3(T),
transform_inverse(T). Twists are (omega, v).
"""

from __future__ import annotations

import numpy as np

from labs.manipulators.toolbox import fk_body, jacobian_body, log_se3, transform_inverse  # noqa: F401


def body_twist_error(T_sb, T_sd) -> np.ndarray:
    """V_b = log(T_sb^-1 T_sd) (6,), (omega, v) in the current end-effector frame."""
    # TODO: README step 1
    raise NotImplementedError("body twist error")


def error_norms(V_b):
    """(|omega|, |v|) as two floats."""
    # TODO
    raise NotImplementedError("error norms")


def newton_step(J, error) -> np.ndarray:
    """Least-squares, minimum-norm dq with J dq = error: np.linalg.lstsq(J, error, rcond=None)."""
    # TODO: README step 3
    raise NotImplementedError("Newton step")


def ik_newton(M, Blist, T_sd, q0, eomg: float = 1e-9, ev: float = 1e-9, max_iters: int = 30):
    """Newton-Raphson IK. Return (q, success, history).

    history[k] = error_norms at iterate k, starting with the initial guess (k = 0). Stop with
    success as soon as |omega| < eomg AND |v| < ev. Otherwise take at most max_iters steps and
    return success False (history then has max_iters + 1 entries).
    """
    # TODO: README step 4
    raise NotImplementedError("Newton-Raphson loop")


def ik_newton_position(position_fn, jacobian_fn, p_des, q0, tol: float = 1e-10,
                       max_iters: int = 30):
    """Position-only Newton: e = p_des - position_fn(q); q += newton_step(jacobian_fn(q), e).
    Return (q, success, errors) with errors[k] = |e| at iterate k (same stopping rules)."""
    # TODO: README step 7
    raise NotImplementedError("position-only Newton")


def convergence_order(errors) -> np.ndarray:
    """p_k = log(e_{k+1}/e_k) / log(e_k/e_{k-1}), for k = 1 .. len-2 (length len(errors) - 2)."""
    # TODO: README step 5, vectorised with numpy slicing
    raise NotImplementedError("convergence order")
