"""Lab 02: ZYX Euler angles (yaw, pitch, roll) and gimbal lock.

You may use the Module 1 toolbox (reference rot_x/rot_y/rot_z) so a bug in
lab01 can't cascade here.
"""

from __future__ import annotations

import numpy as np

from labs.manipulators.toolbox import rot_x, rot_y, rot_z  # noqa: F401

GIMBAL_TOL = 1e-6


def euler_zyx_to_matrix(yaw: float, pitch: float, roll: float) -> np.ndarray:
    """R = Rz(yaw) @ Ry(pitch) @ Rx(roll)."""
    # TODO: one line.
    raise NotImplementedError("compose the three elementary rotations in Z-Y-X order")


def is_gimbal_locked(pitch: float, tol: float = GIMBAL_TOL) -> bool:
    """True when pitch is (numerically) +-pi/2."""
    # TODO: what is cos(pitch) at gimbal lock?
    raise NotImplementedError("detect pitch = +-pi/2")


def matrix_to_euler_zyx(R, tol: float = GIMBAL_TOL):
    """Inverse of euler_zyx_to_matrix. Returns (yaw, pitch, roll), pitch in [-pi/2, pi/2].

    At gimbal lock choose roll = 0 and put all the freedom into yaw.
    """
    # TODO: read the README derivation. Use np.arctan2 everywhere (never arcsin/arccos alone).
    # 1. cos_pitch = hypot(R[0,0], R[1,0]); pitch = arctan2(-R[2,0], cos_pitch)
    # 2. if cos_pitch < tol: gimbal-lock branch (roll = 0, yaw from R[0,1], R[1,1])
    # 3. else: yaw from column 0, roll from row 2
    raise NotImplementedError("extract yaw, pitch, roll")


def euler_rate_matrix(yaw: float, pitch: float, roll: float) -> np.ndarray:
    """E (3x3) with w_s = E @ [yaw_dot, pitch_dot, roll_dot] (space-frame angular velocity)."""
    # TODO: each column is the current direction (in the space frame) of one gimbal axis.
    raise NotImplementedError("stack the three gimbal axes as columns")


def gimbal_lock_demo(pitch: float = np.pi / 2, delta: float = 0.3):
    """Return (R1, R2) for (yaw, roll) = (0, 0) and (delta, delta) at this pitch."""
    # TODO: two calls to euler_zyx_to_matrix. Then look at them: are they equal?
    raise NotImplementedError("build the two matrices")
