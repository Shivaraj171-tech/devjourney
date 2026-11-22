"""Euler angles, ZYX order (yaw, pitch, roll), the way most robot and drone software uses them.

    R = rot_z(yaw) rot_y(pitch) rot_x(roll)

Read right to left about the WORLD axes: roll about x first, then pitch about y,
then yaw about z. (Equivalently, left to right about the box's own moving axes.)
"""
import math

from rigid.mat import matmul
from rigid.rotations import rot_x, rot_y, rot_z

LOCK = 1e-6  # |cos(pitch)| below this: gimbal lock


def from_euler_zyx(yaw, pitch, roll):
    """The rotation matrix for yaw, pitch, roll (radians)."""
    return matmul(rot_z(yaw), matmul(rot_y(pitch), rot_x(roll)))


def to_euler_zyx(R):
    """(yaw, pitch, roll) in radians with from_euler_zyx(yaw, pitch, roll) == R.

    pitch is in [-pi/2, pi/2]. At gimbal lock (pitch = +-90 degrees) only yaw - roll
    (or yaw + roll) is defined, so roll is set to 0 and yaw takes the whole turn.
    """
    # R[2][0] = -sin(pitch). Clamp: rounding can push it a hair past 1.
    s = max(-1.0, min(1.0, R[2][0]))
    pitch = math.asin(s)
    yaw = math.atan2(R[1][0], R[0][0])
    roll = math.atan2(R[2][1], R[2][2])
    return yaw, pitch, roll
