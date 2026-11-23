"""A 3-DOF RRR arm: a turning base (yaw), a shoulder and an elbow (pitch).

    base --(lift D1, turn q1 about z, tip the next joint axis horizontal: Rx(90°))--> frame 1
         --(shoulder: turn q2, walk A2 along the upper arm)--> frame 2
         --(elbow: turn q3, walk A3 along the forearm)--> frame 3 (the wrist)

Positive q2 and q3 lift the arm. Angles in radians, lengths in metres.
"""
import math

from rigid.frames import chain
from rigid.rotations import rot_x, rot_z
from rigid.transform import T_mul
from kin.joints import trans, turn
from kin.planar2 import joint_link

D1 = 0.30  # base to the shoulder axis
A2 = 0.40  # upper arm
A3 = 0.30  # forearm


def rrr_links(q1, q2, q3):
    """[T_0_1, T_1_2, T_2_3]: one transform per joint, each in the frame before it."""
    T01 = T_mul(T_mul(trans(0.0, 0.0, D1), turn(rot_z(q1))), turn(rot_x(math.pi / 2)))
    return [T01, joint_link(q2, A2), joint_link(q3, A3)]


def rrr_fk(q1, q2, q3):
    """T_0_3: the wrist's pose in the base frame, multiplied from the base outwards."""
    return chain(*rrr_links(q1, q2, q3))
