"""Lab 02 reference solution: ZYX Euler angles (yaw, pitch, roll) and gimbal lock."""

from __future__ import annotations

import numpy as np

from labs.manipulators.lab01_rotations.solution import rot_x, rot_y, rot_z

GIMBAL_TOL = 1e-6


def euler_zyx_to_matrix(yaw: float, pitch: float, roll: float) -> np.ndarray:
    """R = Rz(yaw) @ Ry(pitch) @ Rx(roll)."""
    return rot_z(yaw) @ rot_y(pitch) @ rot_x(roll)


def is_gimbal_locked(pitch: float, tol: float = GIMBAL_TOL) -> bool:
    """True when pitch is (numerically) +-pi/2, where yaw and roll axes line up."""
    return bool(abs(np.cos(pitch)) < tol)


def matrix_to_euler_zyx(R, tol: float = GIMBAL_TOL):
    """Inverse of euler_zyx_to_matrix. Returns (yaw, pitch, roll), pitch in [-pi/2, pi/2].

    At gimbal lock only yaw - roll (pitch = +pi/2) or yaw + roll (pitch = -pi/2)
    is defined; we pick the convention roll = 0.
    """
    R = np.asarray(R, dtype=float)
    cos_pitch = np.hypot(R[0, 0], R[1, 0])
    pitch = np.arctan2(-R[2, 0], cos_pitch)
    if cos_pitch < tol:
        roll = 0.0
        yaw = np.arctan2(-R[0, 1], R[1, 1])
    else:
        yaw = np.arctan2(R[1, 0], R[0, 0])
        roll = np.arctan2(R[2, 1], R[2, 2])
    return float(yaw), float(pitch), float(roll)


def euler_rate_matrix(yaw: float, pitch: float, roll: float) -> np.ndarray:
    """E such that the space-frame angular velocity is w_s = E @ [yaw_dot, pitch_dot, roll_dot].

    Columns: z (yaw axis), Rz(yaw) y (pitch axis), Rz(yaw) Ry(pitch) x (roll axis).
    """
    z = np.array([0.0, 0.0, 1.0])
    y = np.array([0.0, 1.0, 0.0])
    x = np.array([1.0, 0.0, 0.0])
    return np.column_stack([z, rot_z(yaw) @ y, rot_z(yaw) @ rot_y(pitch) @ x])


def gimbal_lock_demo(pitch: float = np.pi / 2, delta: float = 0.3):
    """Show two different (yaw, roll) pairs that give the SAME matrix at gimbal lock.

    Returns (R1, R2) for (yaw, roll) = (0, 0) and (delta, delta) at the given pitch.
    At pitch = +pi/2 they are equal; away from it they differ.
    """
    return (euler_zyx_to_matrix(0.0, pitch, 0.0),
            euler_zyx_to_matrix(delta, pitch, delta))
