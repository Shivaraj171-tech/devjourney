"""The Universal Robots UR5e (e-Series): a real 6-DOF arm, by its DH table.

Nominal, uncalibrated DH parameters of the UR5e, standard DH. Sources: Universal Robots' own
ROS 2 description package (github.com/UniversalRobots/Universal_Robots_ROS2_Description, tag
4.4.1, config/ur5e/default_kinematics.yaml, BSD-3-Clause) and the UR5e_PARAMS table of
ur_kinematics (github.com/ros-industrial/universal_robot). Both give the same arm: chaining
the ROS frames reproduces this table to a millionth of a millimetre.
A real robot's calibrated parameters differ slightly (each UR stores its own calibration).
"""
import math

from kin.dh import fk_dh_frames

UR5E_DH = [
    # a        alpha         d         offset
    [0.0, math.pi / 2, 0.1625, 0.0],       # 1 base
    [-0.425, 0.0, 0.0, 0.0],               # 2 shoulder (upper arm 0.425 m)
    [-0.3922, 0.0, 0.0, 0.0],              # 3 elbow (forearm 0.3922 m)
    [0.0, math.pi / 2, 0.1333, 0.0],       # 4 wrist 1
    [0.0, -math.pi / 2, 0.0997, 0.0],      # 5 wrist 2
    [0.0, 0.0, 0.0996, 0.0],               # 6 wrist 3 (out to the tool flange)
]


def ur5e_frames(q):
    """[T_0_0, T_0_1, ..., T_0_6]: the base and the six joint frames (T_0_6: the tool flange)."""
    return fk_dh_frames(UR5E_DH, q)


def ur5e_fk(q):
    """T_0_6: the UR5e's tool flange in its base frame."""
    return ur5e_frames(q)[-1]
