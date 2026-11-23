"""Numerical IK: Newton-Raphson on the position error.

No formula needed, only forward kinematics and the Jacobian. From a guess q:

    e  = p_target - p(q)          how far, and which way, the gripper still has to go
    J dq = e                       the joint step that WOULD close it, if the arm were linear
    q  <- q + dq                   take it, and repeat

Near a solution the error roughly squares at each step (quadratic convergence):
1e-2, 1e-4, 1e-8... A handful of iterations, if the guess is good and J is invertible.
"""
import math

from vel.linalg import solve


def newton_position(fk_point, jacobian, target, q0, iters=10, tol=1e-10):
    """(q, errors, path): errors[k] = |e| at iterate k, path[k] = that iterate's q."""
    q = list(q0)
    errors, path = [], []
    for _ in range(iters + 1):
        p = fk_point(q)
        e = [x - t for t, x in zip(target, p)]  # Byte: the error is where we are minus where we want to be
        errors.append(math.sqrt(sum(x * x for x in e)))
        path.append(list(q))
        if errors[-1] < tol:
            break
        dq = solve(jacobian(q), e)
        q = [a + b for a, b in zip(q, dq)]
    return q, errors, path
