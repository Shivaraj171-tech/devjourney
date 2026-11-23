"""Blending two orientations: slerp (spherical linear interpolation) vs a naive lerp.

Unit quaternions live on a 4D sphere. lerp cuts straight through the sphere (the
blend is shorter than 1 and moves unevenly); slerp walks along the sphere at a
constant angular speed.
"""
import math

from rigid.quat import normalize


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def lerp(q0, q1, t):
    """Naive straight-line blend: NOT a unit quaternion in the middle. For comparison only."""
    return [a + (b - a) * t for a, b in zip(q0, q1)]


def angle_between(q0, q1):
    """The angle (radians, 0..pi) of the turn that takes orientation q0 to q1."""
    return 2 * math.acos(min(1.0, abs(dot(q0, q1))))


def slerp(q0, q1, t):
    """The orientation a fraction t (0..1) of the way from q0 to q1, the short way round, at constant speed."""
    d = dot(q0, q1)
    if d < 0:
        # q1 and -q1 are the same rotation: take the one on q0's side, so we turn the short way.
        q1 = [-c for c in q1]
        d = -d
    if d > 0.9995:
        # Almost the same: the sphere is flat here, a normalised lerp is accurate (and avoids 0 / 0).
        return normalize(lerp(q0, q1, t))
    theta = math.acos(d)  # the angle between them ON THE 4D SPHERE (half the turn angle)
    s = math.sin(theta)
    a = math.sin((1 - t) * theta) / s
    b = math.sin(t * theta) / s
    return [a * x + b * y for x, y in zip(q0, q1)]
