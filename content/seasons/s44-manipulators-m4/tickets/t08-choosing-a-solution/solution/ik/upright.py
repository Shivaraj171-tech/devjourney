"""Module 3's two-link arm (L1 = 0.5 m, L2 = 0.4 m), stood UPRIGHT for this module.

Its joints now turn about horizontal axes, so the arm moves in the vertical x-z plane:
x forward, z up, and the angles are measured from the x axis, positive lifting. That
makes "elbow up" and "elbow down" literal. The plane maths is unchanged: a target
(x, z) here is the (x, y) of the flat arm.
"""
import math

from rigid.rotations import rot_x
from kin.joints import turn
from kin.planar2 import joint_link
from vel.two_link import L1, L2


def upright_links(q, l1=L1, l2=L2):
    """[stand up, T_0_1, T_1_2]: tip the arm's plane up (Rx 90°), then the two links. For viz.arm3d."""
    return [turn(rot_x(math.pi / 2)), joint_link(q[0], l1), joint_link(q[1], l2)]


def upright_tip(q, l1=L1, l2=L2):
    """[x, 0, z] of the gripper."""
    x = l1 * math.cos(q[0]) + l2 * math.cos(q[0] + q[1])
    z = l1 * math.sin(q[0]) + l2 * math.sin(q[0] + q[1])
    return [x, 0.0, z]


def upright_elbow(q, l1=L1):
    return [l1 * math.cos(q[0]), 0.0, l1 * math.sin(q[0])]
