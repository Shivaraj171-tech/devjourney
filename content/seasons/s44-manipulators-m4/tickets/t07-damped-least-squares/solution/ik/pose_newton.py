"""Full-pose Newton-Raphson for the UR5e, on the BODY TWIST error.

The error between where the flange is (T_sb) and where it should be (T_sd) is a pose,
not a vector. Turn it into one: the body twist that would carry the flange onto the
target in one second, written in the flange's own frame:

    V_b = log(T_sb^-1 T_sd)            (w θ, v θ): a 6-vector
    J_b(q) dq = V_b                    the body Jacobian (Module 3) maps joint steps to it
    q <- q + dq

log of a pose T = (R, p): first the rotation, R = e^([w] θ) (axis-angle, Module 1);
then v from p = G(θ) v (Module 2's exponential), so v = G^-1(θ) p with

    G^-1(θ) = I/θ - [w]/2 + (1/θ - cot(θ/2)/2) [w]²
"""
import math

from rigid.axis_angle import skew, to_axis_angle
from rigid.mat import matmul
from rigid.transform import T_inv, T_mul, rotation_of, translation_of
from kin.poe import fk_poe
from kin.ur5e import UR5E_DH
from kin.ur5e_poe import screws_from_dh
from vel.linalg import solve
from vel.screw_jac import body_jacobian

M, SCREWS = screws_from_dh(UR5E_DH)


def ur5e_pose(q):
    return fk_poe(M, SCREWS, q)


def log_SE3(T):
    """The twist (w θ, v θ) with exp = T: rotation by axis-angle, translation through G^-1."""
    axis, theta = to_axis_angle(rotation_of(T))
    p = translation_of(T)
    if theta < 1e-12:
        return [0.0, 0.0, 0.0] + p  # no turn: a pure slide
    K = skew(axis)
    K2 = matmul(K, K)
    k = 1 / theta - 0.5 / math.tan(theta / 2)
    Ginv = [[(1 / theta if i == j else 0.0) - 0.5 * K[i][j] + k * K2[i][j] for j in range(3)] for i in range(3)]
    v = [sum(Ginv[i][j] * p[j] for j in range(3)) for i in range(3)]
    return [a * theta for a in axis] + [x * theta for x in v]


def body_twist_error(T_sb, T_sd):
    """V_b = log(T_sb^-1 T_sd)."""
    return log_SE3(T_mul(T_inv(T_sb), T_sd))


def error_norms(V):
    """(|w θ| in rad, |v θ| in m)."""
    return math.sqrt(sum(x * x for x in V[:3])), math.sqrt(sum(x * x for x in V[3:]))


def newton_pose(T_sd, q0, iters=12, tol=1e-9):
    """(q, errors, path): errors[k] = (|w|, |v|) at iterate k. Stops when both are under tol."""
    q = list(q0)
    errors, path = [], []
    for _ in range(iters + 1):
        V = body_twist_error(ur5e_pose(q), T_sd)
        errors.append(error_norms(V))
        path.append(list(q))
        if max(errors[-1]) < tol:
            break
        dq = solve(body_jacobian(SCREWS, M, q), V)
        q = [a + b for a, b in zip(q, dq)]
    return q, errors, path
