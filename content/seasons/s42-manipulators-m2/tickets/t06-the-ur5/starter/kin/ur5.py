"""The Universal Robots UR5: a real 6-DOF arm, by its DH table.

Nominal, uncalibrated DH parameters of the UR5 (CB-series, not the e-Series UR5e), standard DH.
Source: Universal Robots, "DH parameters for calculations of kinematics and dynamics"
(universal-robots.com, article "dh-parameters-for-calculations-of-kinematics-and-dynamics").
The same numbers are in ROS-Industrial's ur_description and tesseract_kinematics.
A real robot's calibrated parameters differ slightly (each UR stores its own calibration).
"""
import math

from kin.dh import fk_dh_frames

UR5_DH = [
    # a        alpha         d         offset
    [0.0, math.pi / 2, 0.089159, 0.0],     # 1 base
    [0.425, 0.0, 0.0, 0.0],                # 2 shoulder (upper arm 0.425 m: lengths are positive, Byte)
    [0.39225, 0.0, 0.0, 0.0],              # 3 elbow (forearm 0.39225 m)
    [0.0, math.pi / 2, 0.10915, 0.0],      # 4 wrist 1
    [0.0, -math.pi / 2, 0.09465, 0.0],     # 5 wrist 2
    [0.0, 0.0, 0.0823, 0.0],               # 6 wrist 3 (out to the tool flange)
]


def ur5_frames(q):
    """[T_0_0, T_0_1, ..., T_0_6]: the base and the six joint frames (T_0_6: the tool flange)."""
    return fk_dh_frames(UR5_DH, q)


def ur5_fk(q):
    """T_0_6: the UR5's tool flange in its base frame."""
    return ur5_frames(q)[-1]
