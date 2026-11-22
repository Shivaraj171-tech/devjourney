"""Inverse kinematics: which joint angles put Grabby's gripper at a point (x, y)?

forward() goes from angles to a point. inverse() goes back, from a point to angles,
using the law of cosines on the triangle shoulder - elbow - gripper.

Most points have TWO answers, like your own arm reaching for a cup:
  elbow="down": the elbow bends anticlockwise (elbow angle 0 or more)
  elbow="up":   the elbow bends clockwise (elbow angle 0 or less)
"""
import math

from grabby.arm import FOREARM, UPPER_ARM


def inverse(x, y, elbow="down"):
    """(shoulder_deg, elbow_deg) that put the gripper at (x, y). The point must be reachable."""
    distance_squared = x * x + y * y
    # Law of cosines: the elbow angle only depends on how far away the point is.
    cos_elbow = (distance_squared - UPPER_ARM**2 - FOREARM**2) / (2 * UPPER_ARM * FOREARM)
    elbow_angle = math.acos(cos_elbow)
    if elbow == "up":
        elbow_angle = -elbow_angle
    # Aim the shoulder at the point, then correct for the bend in the elbow.
    aim = math.atan(y / x)
    bend = math.atan2(FOREARM * math.sin(elbow_angle), UPPER_ARM + FOREARM * math.cos(elbow_angle))
    return math.degrees(aim - bend), math.degrees(elbow_angle)
