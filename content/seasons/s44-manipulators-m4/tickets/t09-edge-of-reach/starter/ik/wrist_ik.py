"""IK of a 6-DOF arm with a spherical wrist (kin/wrist.py), by decoupling.

The last three axes meet at the wrist centre, so joints 4-6 can't move it: the wrist
centre depends on q1, q2, q3 only. Split the problem in two:

  POSITION: back off from the target flange pose T along its approach axis z6 (the third
            COLUMN of its rotation) by D6:      p_w = p - D6 z6
            then solve q1, q2, q3 so the arm puts its wrist centre at p_w: a base turn and a
            planar two-link arm with links A2 and D4 (ticket 3's method).
  ORIENTATION: with q1..q3 known, the wrist must supply R_3_6 = R_0_3^T R. Read q4..q6
            off it like Euler angles (given below).
"""
import math

from rigid.mat import matmul, transpose
from rigid.transform import rotation_of, translation_of
from kin.dh import fk_dh
from kin.wrist import A2, D1, D4, D6, SPHERICAL6_DH
from ik.two_link_ik import ik_2link


def wrist_center_of(T, d6=D6):
    """p_w = p - d6 z6: back off along the target's approach axis z6."""
    p = translation_of(T)
    z6 = [T[0][2], T[1][2], T[2][2]]
    return [p[i] - d6 * z6[i] for i in range(3)]


def arm_ik(T, elbow="up"):
    """[q1, q2, q3] putting the wrist centre where the target pose T needs it, or None."""
    x, y, z = wrist_center_of(T)
    q1 = math.atan2(y, x)
    planar = ik_2link(math.hypot(x, y), z - D1, A2, D4, elbow)
    if planar is None:
        return None
    return [q1, planar[0], planar[1]]


def wrist_orientation_ik(q123, R):
    """[q4, q5, q6] (q5 >= 0) so that the wrist turns frame 3 into the target orientation R."""
    R03 = rotation_of(fk_dh(SPHERICAL6_DH[:3], q123))
    W = matmul(transpose(R03), R)  # R_3_6
    q4 = math.atan2(W[1][2], W[0][2])
    q5 = math.atan2(math.hypot(W[0][2], W[1][2]), W[2][2])
    q6 = math.atan2(W[2][1], -W[2][0])
    return [q4, q5, q6]


def spherical6_ik(T, elbow="up"):
    """All six joints for the target pose T (front solution, q5 >= 0), or None."""
    q123 = arm_ik(T, elbow)
    if q123 is None:
        return None
    return q123 + wrist_orientation_ik(q123, rotation_of(T))
