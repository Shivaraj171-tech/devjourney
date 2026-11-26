"""Analytic IK of the two-link arm: the law of cosines, then atan2.

Shoulder, elbow and gripper make a triangle with sides l1, l2 and r = |(x, z)|. The law of
cosines gives the elbow:

    r² = l1² + l2² + 2 l1 l2 cos(q2)    =>    c2 = (r² - l1² - l2²) / (2 l1 l2)
    q2 = atan2(±sqrt(1 - c2²), c2)       (two signs: two elbows)

Then the shoulder: the direction to the target, minus the angle the bent arm adds:

    q1 = atan2(z, x) - atan2(l2 sin(q2), l1 + l2 cos(q2))

"up": q2 <= 0, the elbow above the shoulder-gripper line (reaching forward);
"down": q2 >= 0, the elbow below it.
"""
import math

from vel.two_link import L1, L2


def wrap(a):
    """An angle in (-pi, pi]."""
    a = math.fmod(a + math.pi, 2 * math.pi)
    if a <= 0:
        a += 2 * math.pi
    return a - math.pi


def ik_2link(x, z, l1=L1, l2=L2, elbow="up"):
    """(q1, q2) putting the gripper at (x, z), or None when it's out of reach."""
    c2 = (x * x + z * z - l1 * l1 - l2 * l2) / (2 * l1 * l2)
    if abs(c2) > 1:
        return None  # outside the ring: no triangle with these sides
    s2 = math.sqrt(1 - c2 * c2)
    if elbow == "up":
        s2 = -s2
    q2 = math.atan2(s2, c2)
    q1 = wrap(math.atan2(z, x) - math.atan2(l2 * abs(s2), l1 + l2 * c2))
    return q1, q2
