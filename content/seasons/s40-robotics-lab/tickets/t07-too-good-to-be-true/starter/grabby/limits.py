"""Grabby's joint limits, and which boxes it can actually reach.

A real joint can't spin forever: cables, the table and the arm itself get in the
way. Every pose Grabby moves to must keep BOTH joints inside their limits.
"""
import math

from grabby.arm import FOREARM, UPPER_ARM
from grabby.ik import inverse

SHOULDER_LIMITS = (-20, 200)  # degrees: the base hits its stops outside this
ELBOW_LIMITS = (-140, 140)  # degrees: past this the forearm hits the upper arm


def clamp(value, low, high):
    """value, kept between low and high."""
    return max(low, min(high, value))


def reachable(x, y):
    """True if (x, y) is inside the ring the gripper can reach (joint limits aside).

    Too far: more than both links stretched out. Too close: less than the forearm
    folded back over the upper arm.
    """
    distance = math.hypot(x, y)
    return abs(UPPER_ARM - FOREARM) <= distance <= UPPER_ARM + FOREARM


def within_limits(shoulder_deg, elbow_deg):
    """True if both joints are inside their limits."""
    shoulder_ok = SHOULDER_LIMITS[0] <= shoulder_deg <= SHOULDER_LIMITS[1]
    elbow_ok = ELBOW_LIMITS[0] <= elbow_deg <= ELBOW_LIMITS[1]
    return shoulder_ok and elbow_ok


def plan_reach(x, y):
    """(shoulder_deg, elbow_deg) to reach (x, y) within the limits, or None if Grabby can't.

    Tries elbow "down" first, then elbow "up".
    """
    if not reachable(x, y):
        return None
    for elbow in ["down", "up"]:
        shoulder_deg, elbow_deg = inverse(x, y, elbow)
        if within_limits(shoulder_deg, elbow_deg):
            return shoulder_deg, elbow_deg
    return None
