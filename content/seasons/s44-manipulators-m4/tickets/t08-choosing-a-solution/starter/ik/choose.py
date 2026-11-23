"""Choosing among IK solutions: joint limits, then the one closest to where the arm is.

An arm usually has several solutions (ticket 3: four for the 3-DOF arm; a UR5 has up to
eight). The controller must pick ONE:
  1. drop the ones outside the joint limits (low <= q_i <= high for EVERY joint);
  2. of the rest, take the one the arm reaches with the least joint motion: the smallest
     distance sqrt(sum (q_i - now_i)²) from the current joint angles.
No candidate within limits: None (the target can't be reached safely).
"""
import math


def within_limits(q, limits):
    """True when every joint is inside its (low, high) range."""
    return all(low <= qi for qi, (low, high) in zip(q, limits))


def joint_distance(a, b):
    """How far apart two joint configurations are: sqrt(sum of squared differences)."""
    return sum(x - y for x, y in zip(a, b))  # Byte: total joint travel


def pick_solution(candidates, q_now, limits):
    """The candidate within limits closest to q_now, or None."""
    allowed = [q for q in candidates if within_limits(q, limits)]
    if not allowed:
        return None
    return min(allowed, key=lambda q: joint_distance(q, q_now))
