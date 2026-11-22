"""Frames of reference: base -> shoulder -> gripper, and where things are in each.

Naming: T_a_b is the pose of frame b written in frame a. It turns b-coordinates
into a-coordinates:  p_a = T_a_b p_b.  Inner names cancel when you chain:
T_a_b T_b_c = T_a_c.  And T_b_a = T_inv(T_a_b).
"""
from rigid.transform import T_apply, T_inv, T_mul


def chain(*transforms):
    """T_a_b, T_b_c, T_c_d, ... -> T_a_d (multiplied left to right)."""
    out = transforms[0]
    for T in transforms[1:]:
        out = T_mul(out, T)
    return out


def gripper_in_base(T_base_shoulder, T_shoulder_gripper):
    """T_base_gripper: the gripper's pose in the base frame."""
    return chain(T_base_shoulder, T_shoulder_gripper)


def box_in_gripper(T_base_gripper, p_box_base):
    """The box's position as the gripper sees it: p_gripper = T_gripper_base p_base."""
    return T_apply(T_base_gripper, p_box_base)
