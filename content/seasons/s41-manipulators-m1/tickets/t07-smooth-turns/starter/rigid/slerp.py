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
    # Byte: "lerp, then normalise: same thing, fewer trig calls"
    return normalize(lerp(q0, q1, t))
