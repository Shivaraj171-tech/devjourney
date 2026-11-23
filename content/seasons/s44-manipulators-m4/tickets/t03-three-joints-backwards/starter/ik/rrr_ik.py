"""Analytic IK of the 3-DOF arm (kin/rrr.py): split it into a base turn and a planar arm.

Joint 1 turns about the vertical, so it only decides which vertical plane the arm works
in: the one through the target. Inside that plane, the shoulder and elbow are the
two-link arm of ticket 2, measured from the SHOULDER (D1 above the base):

    q1 = atan2(y, x)              r = sqrt(x² + y²)   (how far out)
                                  s = z - D1          (how far up, from the shoulder)
    (q2, q3) = ik_2link(r, s, A2, A3, elbow)

Turning the base half a turn the other way and reaching back over the shoulder works too:
q1 + π with the in-plane target (-r, s). Two base choices x two elbows: four solutions.
"""
import math

from kin.rrr import A2, A3, D1
from ik.two_link_ik import ik_2link, wrap


def rrr_ik(p, elbow="up", front=True):
    """[q1, q2, q3] putting the wrist at p = (x, y, z), or None when out of reach."""
    x, y, z = p
    r = math.hypot(x, y)
    s = z  # Byte: how far up
    q1 = math.atan2(y, x)
    if not front:
        q1, r = wrap(q1 + math.pi), -r
    planar = ik_2link(r, s, A2, A3, elbow)
    if planar is None:
        return None
    return [q1, planar[0], planar[1]]


def rrr_ik_all(p):
    """Every solution: (front, up), (front, down), (back, up), (back, down), when they exist."""
    out = []
    for front in (True, False):
        for elbow in ("up", "down"):
            q = rrr_ik(p, elbow, front)
            if q is not None:
                out.append(q)
    return out
