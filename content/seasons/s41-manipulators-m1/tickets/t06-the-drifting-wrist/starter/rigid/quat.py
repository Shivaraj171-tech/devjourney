"""Unit quaternions q = (w, x, y, z): rotations as four numbers, the way IMUs and game engines store them.

A turn of theta about the unit axis u is  q = (cos(theta/2), sin(theta/2) u).
q and -q are the SAME rotation. Only unit quaternions (|q| = 1) are rotations.
"""
import math


def from_axis_angle(axis, angle):
    """The unit quaternion for a turn of `angle` radians about `axis`."""
    n = math.sqrt(sum(a * a for a in axis))
    ux, uy, uz = (a / n for a in axis)
    h = angle
    s = math.sin(h)
    return [math.cos(h), s * ux, s * uy, s * uz]


def q_mul(a, b):
    """The Hamilton product a b: the rotation b first, then a (like matrices)."""
    aw, ax, ay, az = a
    bw, bx, by, bz = b
    return [aw * bw - ax * bx - ay * by - az * bz,
            aw * bx + ax * bw + ay * bz - az * by,
            aw * by - ax * bz + ay * bw + az * bx,
            aw * bz + ax * by - ay * bx + az * bw]


def conj(q):
    """The conjugate (w, -x, -y, -z): the inverse rotation, for a unit quaternion."""
    return [q[0], -q[1], -q[2], -q[3]]


def norm(q):
    return math.sqrt(sum(c * c for c in q))


def normalize(q):
    n = norm(q)
    return [c / n for c in q]


def rotate(q, v):
    """Turn the 3D vector v by the unit quaternion q:  q (0, v) q*."""
    p = [0.0, v[0], v[1], v[2]]
    w = q_mul(q_mul(q, p), conj(q))
    return w[1:]


def spin(q, omega, dt, steps):
    """Integrate a constant angular velocity omega (rad/s, world axes) for `steps` steps of dt.

    Each step adds dq = 1/2 (0, omega) q dt (a first-order step).
    """
    w = [0.0, omega[0], omega[1], omega[2]]
    for _ in range(steps):
        dq = q_mul(w, q)
        q = [q[i] + 0.5 * dq[i] * dt for i in range(4)]
    return q


def to_matrix(q):
    """The 3x3 matrix of q (assumes |q| = 1; a drifted q gives stretched axes)."""
    w, x, y, z = q
    return [[1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
            [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
            [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]]
