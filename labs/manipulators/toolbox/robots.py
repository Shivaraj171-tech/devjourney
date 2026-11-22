"""Robot parameter tables used across Modules 2 and 3.

DH rows are (a, alpha, d, theta_offset) in the *standard* (distal) DH convention:
    T_{i-1,i} = Rz(theta_i + offset) Tz(d_i) Tx(a_i) Rx(alpha_i)
Units: metres and radians.
"""

import numpy as np

# UR5 (CB-series, not the e-Series UR5e).
# Source: Universal Robots, "DH parameters for calculations of kinematics and dynamics",
#   https://www.universal-robots.com/articles/ur/application-installation/dh-parameters-for-calculations-of-kinematics-and-dynamics/
# The same numbers appear in ROS-Industrial's ur_description ur5 xacro and in
# tesseract_kinematics' UR5Parameters (0.089159, -0.425, -0.39225, 0.10915, 0.09465, 0.0823).
# Nominal values: a real robot's calibrated parameters differ slightly (see ur_calibration).
UR5_DH = np.array([
    # a          alpha        d          offset
    [0.0,        np.pi / 2,   0.089159,  0.0],
    [-0.425,     0.0,         0.0,       0.0],
    [-0.39225,   0.0,         0.0,       0.0],
    [0.0,        np.pi / 2,   0.10915,   0.0],
    [0.0,        -np.pi / 2,  0.09465,   0.0],
    [0.0,        0.0,         0.0823,    0.0],
])

# A generic 3-DOF "anthropomorphic" arm (base yaw, shoulder pitch, elbow pitch), our own
# parameters (not a real product): shoulder height 0.30 m, upper arm 0.40 m, forearm 0.30 m.
# Same structure as Siciliano et al., "Robotics: Modelling, Planning and Control", sec. 2.9.
ARM3_D1, ARM3_A2, ARM3_A3 = 0.30, 0.40, 0.30
ARM3_DH = np.array([
    [0.0,      np.pi / 2, ARM3_D1, 0.0],
    [ARM3_A2,  0.0,       0.0,     0.0],
    [ARM3_A3,  0.0,       0.0,     0.0],
])

# Planar 2R arm (used for manipulability ellipses).
PLANAR2R_L1, PLANAR2R_L2 = 1.0, 0.8
