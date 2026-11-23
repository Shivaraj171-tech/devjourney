"""The product of exponentials (PoE): forward kinematics from screw axes.

A joint is a SCREW AXIS S = (omega, v): for a revolute joint omega is the unit axis and
v = -omega x q for any point q on the axis; a prismatic joint has omega = 0 and v its unit
direction. Moving the joint by theta is the matrix exponential of the twist [S] theta:

    e^([S] theta) = [[ R,  G(theta) v ], [0, 1]]
    R        = I + sin(theta) [omega] + (1 - cos(theta)) [omega]^2        (Rodrigues)
    G(theta) = I theta + (1 - cos(theta)) [omega] + (theta - sin(theta)) [omega]^2

and the arm's pose is   T(q) = e^([S1] q1) e^([S2] q2) ... e^([Sn] qn) M,
with M the tool's pose at the HOME configuration (every joint at 0).
"""
import math

from rigid.axis_angle import rodrigues, skew
from rigid.mat import identity, mat_vec, matmul
from rigid.transform import T_mul, make_T


def cross(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]


def revolute_screw(axis, point):
    """S = (omega, -omega x q) for a revolute joint about the unit `axis` through `point`."""
    w = list(axis)
    v = cross(w, point)
    return w + [-v[0], -v[1], -v[2]]


def exp_twist(S, theta):
    """e^([S] theta) as a 4x4, for a screw axis S = (omega, v) with |omega| = 1 or omega = 0."""
    w, v = S[:3], S[3:]
    if max(abs(c) for c in w) < 1e-12:
        return make_T(identity(3), [c * theta for c in v])  # prismatic: a pure slide
    K = skew(w)
    K2 = matmul(K, K)
    s, c = math.sin(theta), math.cos(theta)
    G = [[(theta if i == j else 0.0) + (1 - c) * K[i][j] + (theta - s) * K2[i][j] for j in range(3)]
         for i in range(3)]
    return make_T(rodrigues(w, theta), mat_vec(G, v))


def fk_poe(M, screws, q):
    """T(q) = e^([S1] q1) ... e^([Sn] qn) M   (space-frame screw axes)."""
    T = identity(4)
    for S, qi in zip(screws, q):
        T = T_mul(T, exp_twist(S, qi))
    return T_mul(T, M)
