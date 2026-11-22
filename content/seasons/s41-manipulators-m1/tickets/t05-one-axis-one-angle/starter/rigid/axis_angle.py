"""Axis-angle: any rotation is ONE turn by an angle about ONE axis (Euler's rotation theorem).

Rodrigues' formula builds the matrix:  R = I + sin(theta) K + (1 - cos(theta)) K^2,
where K = skew(u) is the "cross product with u" matrix of the UNIT axis u.
"""
import math

from rigid.mat import identity, matmul


def skew(w):
    """The matrix K with K v == cross(w, v) for every vector v."""
    wx, wy, wz = w
    return [[0.0, -wz, wy],
            [wz, 0.0, -wx],
            [-wy, wx, 0.0]]


def unit(v):
    """v scaled to length 1."""
    n = math.sqrt(sum(x * x for x in v))
    if n < 1e-12:
        raise ValueError("a rotation axis can't be the zero vector")
    return [x / n for x in v]


def rodrigues(axis, angle):
    """The rotation matrix for a turn of `angle` radians about `axis` (any length, not zero)."""
    K = skew(axis)
    K2 = matmul(K, K)
    I = identity(3)
    s, c = math.sin(angle), math.cos(angle)
    return [[I[i][j] + s * K[i][j] + (1 - c) * K2[i][j] for j in range(3)] for i in range(3)]


def to_axis_angle(R):
    """(unit axis, angle in [0, pi]) with rodrigues(axis, angle) == R.

    The trace gives the angle: trace(R) = 1 + 2 cos(theta). The axis comes from the
    antisymmetric part R - R^T = 2 sin(theta) K, which vanishes near 180 degrees, so
    there the axis is read from the symmetric part instead.
    """
    trace = R[0][0] + R[1][1] + R[2][2]
    angle = math.acos(max(-1.0, min(1.0, (trace - 1) / 2)))
    if angle < 1e-9:
        return [0.0, 0.0, 1.0], 0.0  # no turn: any axis will do
    w = [R[2][1] - R[1][2], R[0][2] - R[2][0], R[1][0] - R[0][1]]
    return [x / (2 * math.sin(angle)) for x in w], angle
