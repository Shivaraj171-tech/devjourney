"""Grabby's placing move in 3D: joint angles -> the gripper's pose in the base frame.

Grabby's chain of frames, from the floor up:

  base --(lift BASE_HEIGHT, turn yaw about z)--> turntable
       --(tilt pitch about y, then walk UPPER_ARM along the tilted arm)--> wrist
       --(walk TOOL along the wrist's x, then twist roll about it)--> gripper

Positive pitch tips the arm DOWN (rot_y turns x towards -z). Angles in radians.
"""
from rigid.frames import chain
from rigid.mat import identity
from rigid.rotations import rot_x, rot_y, rot_z
from rigid.transform import T_mul, make_T

BASE_HEIGHT = 0.40  # metres, base to the shoulder joint
UPPER_ARM = 0.50  # shoulder to wrist
TOOL = 0.12  # wrist to the gripper's fingertips


def trans(x, y, z):
    """A pure move: no turn."""
    return make_T(identity(3), (x, y, z))


def turn(R):
    """A pure turn: no move."""
    return make_T(R, (0.0, 0.0, 0.0))


def T_base_turntable(yaw):
    return T_mul(trans(0.0, 0.0, BASE_HEIGHT), turn(rot_z(yaw)))


def T_turntable_wrist(pitch):
    return T_mul(trans(UPPER_ARM, 0.0, 0.0), turn(rot_y(pitch)))


def T_wrist_gripper(roll):
    return T_mul(trans(TOOL, 0.0, 0.0), turn(rot_x(roll)))


def gripper_pose(yaw, pitch, roll):
    """T_base_gripper: base -> turntable -> wrist -> gripper, in that order."""
    return chain(T_wrist_gripper(roll), T_turntable_wrist(pitch), T_base_turntable(yaw))
