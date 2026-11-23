"""The two-link arm of this module, lying flat (turning about vertical z axes).

Each joint turns about its own z axis, then its link walks along the turned x axis
(kin/planar2.py). L1 = 0.5 m, L2 = 0.4 m. Angles in radians.
"""
from kin.planar2 import joint_link, tip_2link

L1 = 0.5  # upper arm
L2 = 0.4  # forearm


def two_link_tip(q):
    """[x, y, z] of the gripper for joint angles q = [q1, q2]."""
    return tip_2link(q[0], q[1], L1, L2)


def two_link_links(q):
    """[T_0_1, T_1_2]: the link transforms, for drawing with viz.arm3d."""
    return [joint_link(q[0], L1), joint_link(q[1], L2)]
