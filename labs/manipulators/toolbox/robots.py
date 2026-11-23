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

# Joint limits used by the IK and trajectory labs (Modules 4-5). The real UR5 allows +-2 pi on
# every joint; we use tighter, "safe cell" limits so that limits actually matter in the labs.
# Velocity/acceleration limits: 180 deg/s per joint is the UR5 (CB-series) datasheet speed as
# we recall it (not re-checked against the datasheet); the acceleration limit is our own
# conservative choice.
UR5_Q_MIN = np.array([-np.pi, -np.pi, -np.pi, -np.pi, -np.pi, -np.pi])
UR5_Q_MAX = -UR5_Q_MIN
UR5_QD_MAX = np.full(6, np.pi)        # rad/s
UR5_QDD_MAX = np.full(6, 2 * np.pi)   # rad/s^2 (our choice)

# ---------------------------------------------------------------- inertial parameters (Module 6)
# One row per link: (mass [kg], centre of mass (x, y, z) in DH frame i [m],
#                    principal moments (Ixx, Iyy, Izz) about the COM, axes parallel to DH frame i
#                    [kg m^2]).
# Link i is the body that joint i moves; DH frame i is attached to its far end.

# ARM3: our own numbers, chosen to be plausible for a 1 m tabletop arm. The column (link 1) sits
# below the shoulder frame (y1 = world up), the arm links are rods whose COM sits half way back
# along -x_i. Inertias: solid cylinders, radius 0.04 m.
ARM3_LINKS = (
    (3.0, (0.0, -0.15, 0.0), (0.0237, 0.0024, 0.0237)),
    (2.0, (-0.20, 0.0, 0.0), (0.0016, 0.0275, 0.0275)),
    (1.2, (-0.15, 0.0, 0.0), (0.00096, 0.0095, 0.0095)),
)

# UR5: link masses and centres of mass as we recall them from the dynamics columns of the same
# Universal Robots DH article cited above. That site was not reachable when this was written, so
# treat them as UR5-LIKE, not verified against the source. The inertia tensors are our own
# cylinder approximations. The labs only need a self-consistent model: MuJoCo, given the same
# numbers, is the referee.
UR5_LINKS = (
    (3.7,    (0.0, -0.02561, 0.00193),  (0.0103, 0.0067, 0.0103)),
    (8.393,  (0.2125, 0.0, 0.11336),    (0.0151, 0.1339, 0.1339)),
    (2.33,   (0.15, 0.0, 0.0265),       (0.0041, 0.0312, 0.0312)),
    (1.219,  (0.0, -0.0018, 0.01634),   (0.0022, 0.0022, 0.0020)),
    (1.219,  (0.0, 0.0018, 0.01634),    (0.0022, 0.0022, 0.0020)),
    (0.1879, (0.0, 0.0, -0.001159),     (0.00013, 0.00013, 0.00017)),
)

# Planar 2R arm for Lagrangian dynamics (lab 18): links along x in the vertical x-z plane,
# both joints about -y (so +q lifts the arm), gravity -z. Uniform rods: lc = l/2 and
# I = m l^2 / 12 about the COM (the swing axis). Our own numbers.
PLANAR2R_DYN = {
    "l1": 1.0, "l2": 0.8, "m1": 1.0, "m2": 0.8, "lc1": 0.5, "lc2": 0.4,
    "I1": 1.0 * 1.0**2 / 12, "I2": 0.8 * 0.8**2 / 12, "g": 9.81,
}
