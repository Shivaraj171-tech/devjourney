"""Wrists: a 6-DOF arm with a SPHERICAL wrist, and its wrist centre.

A spherical wrist's last three joint axes meet at one point, the wrist centre. Turning
joints 4-6 spins the gripper about that point but never moves it, so the wrist centre
depends on joints 1-3 only: position and orientation decouple (Module 4's IK uses this).

SPHERICAL6_DH: an anthropomorphic arm (a base, a shoulder, an elbow, the forearm along z3)
plus a spherical wrist. Our own textbook numbers, the structure of Siciliano et al.,
"Robotics: Modelling, Planning and Control", section 2.9.
"""
import math

from rigid.transform import T_apply
from kin.dh import fk_dh

D1, A2, D4, D6 = 0.30, 0.40, 0.30, 0.10

SPHERICAL6_DH = [
    # a     alpha          d     offset
    [0.0, math.pi / 2, D1, 0.0],             # 1 base yaw
    [A2, 0.0, 0.0, 0.0],                     # 2 shoulder
    [0.0, math.pi / 2, 0.0, math.pi / 2],    # 3 elbow (offset: the forearm is straight out at q3 = 0)
    [0.0, -math.pi / 2, D4, 0.0],            # 4 forearm roll: walk the forearm along z3
    [0.0, math.pi / 2, 0.0, 0.0],            # 5 wrist pitch
    [0.0, 0.0, D6, 0.0],                     # 6 wrist roll, then out to the flange along z
]


def wrist_center(T_0_6, d6):
    """Back off from the flange by d6 along its approach axis z6 (the THIRD COLUMN of R)."""
    z6 = [T_0_6[0][2], T_0_6[1][2], T_0_6[2][2]]
    return [T_0_6[i][3] - d6 * z6[i] for i in range(3)]


def wrist_center_from_arm(q1, q2, q3):
    """The wrist centre from the first three joints alone: D4 along z3 from frame 3."""
    return T_apply(fk_dh(SPHERICAL6_DH[:3], [q1, q2, q3]), (0.0, 0.0, D4))
