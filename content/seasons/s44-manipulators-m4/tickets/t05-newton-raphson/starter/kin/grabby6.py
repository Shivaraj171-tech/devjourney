"""Grabby-6: Orbit Orders' new six-joint packing arm (a spherical wrist), and its gripper.

GRABBY6_DH: standard DH (a, alpha, d, theta_offset), metres and radians, from the
vendor's sheet. TOOL: the fingertips sit TOOL metres beyond the flange, along z6.
"""
import math

from rigid.transform import T_mul
from kin.dh import fk_dh_frames
from kin.joints import trans

GRABBY6_DH = [
    # a     alpha          d     offset
    [0.0, math.pi / 2, 0.40, 0.0],           # 1 base yaw
    [0.50, 0.0, 0.0, 0.0],                   # 2 shoulder
    [0.0, math.pi / 2, 0.0, math.pi / 2],    # 3 elbow: the forearm is straight out at q3 = 0
    [0.0, -math.pi / 2, 0.45, 0.0],          # 4 forearm roll
    [0.0, math.pi / 2, 0.0, 0.0],            # 5 wrist pitch
    [0.0, 0.0, 0.08, 0.0],                   # 6 wrist roll (out to the flange)
]
TOOL = 0.12  # flange to the fingertips, along z6


def arm_frames(q):
    """The base, the six joint frames and the fingertips: everything the 3D view draws."""
    frames = fk_dh_frames(GRABBY6_DH, q)
    return frames + [T_mul(frames[-1], trans(0.0, 0.0, TOOL))]


def gripper_pose(q):
    """T_0_tool: where the fingertips are (the flange pose times the tool offset)."""
    return arm_frames(q)[-1]
