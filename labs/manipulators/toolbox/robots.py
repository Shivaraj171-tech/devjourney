"""Robot parameter tables used across Modules 2 and 3.

DH rows are (a, alpha, d, theta_offset) in the *standard* (distal) DH convention:
    T_{i-1,i} = Rz(theta_i + offset) Tz(d_i) Tx(a_i) Rx(alpha_i)
Units: metres and radians.
"""

import numpy as np

# Sources for every UR5e number below (read 2026-11-23; DH and inertials cross-checked numerically):
#  [UR-ROS2] Universal Robots' official description package, UniversalRobots/
#      Universal_Robots_ROS2_Description, tag 4.4.1 (commit 0eb1a861), BSD-3-Clause:
#      config/ur5e/default_kinematics.yaml, physical_parameters.yaml, joint_limits.yaml.
#      https://github.com/UniversalRobots/Universal_Robots_ROS2_Description/tree/4.4.1/config/ur5e
#  [UR-KIN] ros-industrial/universal_robot (noetic-devel, commit 39ad110d), BSD:
#      ur_kinematics/src/ur_kin.cpp, UR5e_PARAMS (d1, a2, a3, d4, d5, d6). Its ur_description/
#      config/ur5e/*.yaml carry the same kinematics, masses, centres of mass and tensors.
#  [UR-DH] Universal Robots, "DH parameters for calculations of kinematics and dynamics",
#      https://www.universal-robots.com/articles/ur/application-installation/dh-parameters-for-calculations-of-kinematics-and-dynamics/
#      (not reachable from where this was written; [UR-ROS2]'s physical_parameters.yaml says its
#      centres of mass come from this article and documents the axis mapping, which we inverted)

# UR5e (e-Series) DH table, standard DH, from [UR-KIN] UR5e_PARAMS:
#   d1 = 0.1625, a2 = -0.425, a3 = -0.3922, d4 = 0.1333, d5 = 0.0997, d6 = 0.0996,
#   alpha = (pi/2, 0, 0, pi/2, -pi/2, 0).
# Cross-check: chaining [UR-ROS2]'s default_kinematics.yaml frames (the URDF joint origins, in
# UR's base frame `base_link_inertia`) gives the same flange pose as this table to 6e-10 m over
# 200 random configurations, with the same zero pose and joint directions.
# Nominal values: each real robot ships with calibrated parameters that differ slightly.
UR5E_DH = np.array([
    # a          alpha        d          offset
    [0.0,        np.pi / 2,   0.1625,    0.0],
    [-0.425,     0.0,         0.0,       0.0],
    [-0.3922,    0.0,         0.0,       0.0],
    [0.0,        np.pi / 2,   0.1333,    0.0],
    [0.0,        -np.pi / 2,  0.0997,    0.0],
    [0.0,        0.0,         0.0996,    0.0],
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

# Joint limits used by the IK and trajectory labs (Modules 4-5).
# Official ([UR-ROS2] joint_limits.yaml, citing the UR5e User Manual v5.8): +-360 deg on every
# joint (the ROS file halves the elbow to +-180 deg: the shoulder lift gets in the way beyond
# about +-pi), 180 deg/s on every joint, peak torques 150 N m (base, shoulder, elbow) and
# 28 N m (wrists). Accelerations are "not publicly available".
# We use tighter "safe cell" position limits (+-pi on every joint) so that limits actually matter
# in the labs, and our own conservative acceleration limit.
UR5E_Q_MIN = np.array([-np.pi, -np.pi, -np.pi, -np.pi, -np.pi, -np.pi])
UR5E_Q_MAX = -UR5E_Q_MIN
UR5E_QD_MAX = np.full(6, np.pi)        # rad/s: 180 deg/s, official
UR5E_QDD_MAX = np.full(6, 2 * np.pi)   # rad/s^2 (our choice)
UR5E_TAU_MAX = np.array([150.0, 150.0, 150.0, 28.0, 28.0, 28.0])  # N m, official

# ---------------------------------------------------------------- inertial parameters (Module 6)
# One row per link: (mass [kg], centre of mass (x, y, z) in DH frame i [m],
#                    inertia about the COM, axes parallel to DH frame i [kg m^2]: either the
#                    principal moments (Ixx, Iyy, Izz) or a full symmetric 3x3 tensor).
# Link i is the body that joint i moves; DH frame i is attached to its far end.

# ARM3: our own numbers, chosen to be plausible for a 1 m tabletop arm. The column (link 1) sits
# below the shoulder frame (y1 = world up), the arm links are rods whose COM sits half way back
# along -x_i. Inertias: solid cylinders, radius 0.04 m.
ARM3_LINKS = (
    (3.0, (0.0, -0.15, 0.0), (0.0237, 0.0024, 0.0237)),
    (2.0, (-0.20, 0.0, 0.0), (0.0016, 0.0275, 0.0275)),
    (1.2, (-0.15, 0.0, 0.0), (0.00096, 0.0095, 0.0095)),
)

# UR5e: official masses, centres of mass and inertia tensors ([UR-ROS2] physical_parameters.yaml).
# The yaml gives each COM and tensor in the URDF link frame (at the joint, z along the joint axis)
# with an extra roll for the tensor; we transformed both into DH frame i (the frame chain matches
# to 6e-10 m, see above). The COMs come out exactly as [UR-DH]'s columns (the yaml's comments
# give the mapping), and the tensors come out with the yaml's own numbers: UR states them in the
# DH frames. Tensors are about the COM, axes parallel to DH frame i, full 3x3 (UR's products of
# inertia are small but not zero: the forearm's Ixz is a third of its Ixx).
UR5E_LINKS = (
    (3.761, (0.0, -0.02561, 0.00193),
     ((0.0070021, 0.00000073, -0.00001053),
      (0.00000073, 0.00648091, 0.00049994),
      (-0.00001053, 0.00049994, 0.00657286))),
    (8.058, (0.2125, 0.0, 0.11336),
     ((0.01505885, -0.000054, 0.00000563),
      (-0.000054, 0.33388086, -0.00000181),
      (0.00000563, -0.00000181, 0.33247207))),
    (2.846, (0.15, 0.0, 0.0265),
     ((0.00399632, -0.00001365, 0.00137272),
      (-0.00001365, 0.07879254, -0.0000066),
      (0.00137272, -0.0000066, 0.0784851))),
    (1.37, (0.0, -0.0018, 0.01634),
     ((0.00165491, -0.00000282, -0.00000438),
      (-0.00000282, 0.00135962, 0.00010157),
      (-0.00000438, 0.00010157, 0.00126279))),
    (1.3, (0.0, 0.0018, 0.01634),
     ((0.00135617, -0.00000274, 0.00000444),
      (-0.00000274, 0.00127827, -0.00005048),
      (0.00000444, -0.00005048, 0.00096614))),
    (0.365, (0.0, 0.0, -0.001159),
     ((0.00018694, 0.00000006, -0.00000017),
      (0.00000006, 0.00018908, -0.00000092),
      (-0.00000017, -0.00000092, 0.00025756))),
)

# Planar 2R arm for Lagrangian dynamics (lab 18): links along x in the vertical x-z plane,
# both joints about -y (so +q lifts the arm), gravity -z. Uniform rods: lc = l/2 and
# I = m l^2 / 12 about the COM (the swing axis). Our own numbers.
PLANAR2R_DYN = {
    "l1": 1.0, "l2": 0.8, "m1": 1.0, "m2": 0.8, "lc1": 0.5, "lc2": 0.4,
    "I1": 1.0 * 1.0**2 / 12, "I2": 0.8 * 0.8**2 / 12, "g": 9.81,
}
