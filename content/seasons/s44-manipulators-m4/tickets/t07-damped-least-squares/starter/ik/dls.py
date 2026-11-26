"""Damped least squares (Levenberg-Marquardt style): Newton that can't explode.

Plain Newton solves J dq = e exactly. Near a singularity J is nearly non-invertible and
dq becomes enormous. Damped least squares asks for a COMPROMISE instead: make J dq close
to e, but keep dq small:

    minimise |J dq - e|² + λ² |dq|²     =>     dq = J^T (J J^T + λ² I)^-1 e

Far from singularities (σ >> λ) it's almost plain Newton. Near them (σ << λ) the step
along the bad direction shrinks to σ/λ² instead of blowing up as 1/σ.
"""
import math

from rigid.mat import mat_vec, matmul, transpose
from vel.linalg import solve


def dls_step(J, e, lam):
    """dq = J^T (J J^T + λ² I)^-1 e."""
    return solve(J, e)


def ik_dls(fk_point, jacobian, target, q0, lam=0.05, iters=40, tol=1e-8):
    """(q, errors, steps): position IK with damped steps. steps[k] = |dq| of step k."""
    q = list(q0)
    errors, steps = [], []
    for _ in range(iters + 1):
        e = [t - x for t, x in zip(target, fk_point(q))]
        errors.append(math.sqrt(sum(x * x for x in e)))
        if errors[-1] < tol or len(steps) == iters:
            break
        dq = dls_step(jacobian(q), e, lam)
        steps.append(math.sqrt(sum(x * x for x in dq)))
        q = [a + b for a, b in zip(q, dq)]
    return q, errors, steps
