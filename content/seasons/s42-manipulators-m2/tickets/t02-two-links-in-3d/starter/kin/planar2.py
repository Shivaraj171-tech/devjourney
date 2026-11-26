"""A two-link arm, drawn in 3D: forward kinematics by composing one transform per joint.

Each joint turns about its own z axis, then its link walks along the turned x axis:

    T_0_1 = Rz(q1) Tx(l1)      T_1_2 = Rz(q2) Tx(l2)      T_0_2 = T_0_1 T_1_2
"""
from rigid.mat import identity
from rigid.rotations import rot_z
from rigid.transform import T_mul, translation_of
from kin.joints import trans, turn


def joint_link(q, length):
    """Turn by q at the joint (about z), then walk `length` along the TURNED x axis."""
    return T_mul(turn(rot_z(q)), trans(length, 0.0, 0.0))


def frames_in_base(links):
    """[T_0_1, T_0_2, ...]: where each joint's frame is in the BASE frame.

    Each one is the running product of the link transforms so far, root first:
    T_0_k = T_0_1 T_1_2 ... T_(k-1)_k.
    """
    out = []
    for link in links:
        out.append(link)
    return out


def tip_2link(q1, q2, l1, l2):
    """Where the tip of a two-link arm is, in the base frame."""
    return translation_of(frames_in_base([joint_link(q1, l1), joint_link(q2, l2)])[-1])
