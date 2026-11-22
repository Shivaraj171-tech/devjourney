"""Lab 01 reference solution: rotation matrices and SO(3)."""

from __future__ import annotations

import numpy as np


def rot_x(theta: float) -> np.ndarray:
    """Rotation by ``theta`` radians about the x axis."""
    c, s = np.cos(theta), np.sin(theta)
    return np.array([[1.0, 0.0, 0.0],
                     [0.0, c, -s],
                     [0.0, s, c]])


def rot_y(theta: float) -> np.ndarray:
    """Rotation by ``theta`` radians about the y axis."""
    c, s = np.cos(theta), np.sin(theta)
    return np.array([[c, 0.0, s],
                     [0.0, 1.0, 0.0],
                     [-s, 0.0, c]])


def rot_z(theta: float) -> np.ndarray:
    """Rotation by ``theta`` radians about the z axis."""
    c, s = np.cos(theta), np.sin(theta)
    return np.array([[c, -s, 0.0],
                     [s, c, 0.0],
                     [0.0, 0.0, 1.0]])


def is_rotation_matrix(R, tol: float = 1e-6) -> bool:
    """True if R is 3x3, orthonormal (R^T R = I) and right-handed (det R = +1)."""
    R = np.asarray(R, dtype=float)
    if R.shape != (3, 3):
        return False
    if not np.allclose(R.T @ R, np.eye(3), atol=tol):
        return False
    return abs(np.linalg.det(R) - 1.0) < tol


def project_to_so3(M) -> np.ndarray:
    """Closest rotation matrix to M in the Frobenius norm (via SVD)."""
    U, _, Vt = np.linalg.svd(np.asarray(M, dtype=float))
    D = np.diag([1.0, 1.0, np.sign(np.linalg.det(U @ Vt))])
    return U @ D @ Vt


def skew(w) -> np.ndarray:
    """3-vector -> 3x3 skew-symmetric matrix [w] with [w] @ v == cross(w, v)."""
    wx, wy, wz = np.asarray(w, dtype=float)
    return np.array([[0.0, -wz, wy],
                     [wz, 0.0, -wx],
                     [-wy, wx, 0.0]])


def vee(W) -> np.ndarray:
    """Inverse of skew: 3x3 skew-symmetric matrix -> 3-vector."""
    W = np.asarray(W, dtype=float)
    return np.array([W[2, 1], W[0, 2], W[1, 0]])


def relative_rotation(R_sa, R_sb) -> np.ndarray:
    """Orientation of frame b expressed in frame a: R_ab = R_sa^T R_sb."""
    return np.asarray(R_sa).T @ np.asarray(R_sb)
