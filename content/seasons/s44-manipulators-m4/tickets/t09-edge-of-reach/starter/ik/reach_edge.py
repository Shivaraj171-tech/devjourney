"""Grabby-6's production IK (a UR5): full pose, body twist error, damped and clamped.

Each iteration:
    V_b = log(T_sb^-1 T_sd)                     the error, as a body twist
    dq  = J_b^T (J_b J_b^T + λ² I)^-1 V_b       a DAMPED step (ticket 7)
    dq  = clamp(dq, MAX_STEP)                   never more than MAX_STEP rad on any joint
    q  <- q + dq

Damping keeps the step sane near singularities (a box at the edge of the workspace means
an almost stretched elbow); the clamp keeps any single iteration from swinging the arm
round, so a bad linearisation can't throw the next one somewhere worse.
"""
from ik.dls import dls_step
from ik.pose_newton import SCREWS, M, body_twist_error, error_norms, ur5_pose
from vel.linalg import solve
from vel.screw_jac import body_jacobian

LAMBDA = 0.02
MAX_STEP = 0.2  # rad per joint per iteration


def clamp_step(dq, max_step=MAX_STEP):
    """Scale dq down (keeping its direction) so that no joint moves more than max_step."""
    biggest = max(abs(x) for x in dq)
    if biggest <= max_step:
        return list(dq)
    return [x * max_step / biggest for x in dq]


def reach(T_sd, q0, iters=60, tol=1e-6):
    """(q, errors, path) like newton_pose, with damped, clamped steps."""
    q = list(q0)
    errors, path = [], []
    for _ in range(iters + 1):
        V = body_twist_error(ur5_pose(q), T_sd)
        errors.append(error_norms(V))
        path.append(list(q))
        if max(errors[-1]) < tol:
            break
        dq = solve(body_jacobian(SCREWS, M, q), V)  # Byte: plain Newton, fastest convergence
        q = [a + b for a, b in zip(q, dq)]
    return q, errors, path
