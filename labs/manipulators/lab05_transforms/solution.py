"""Lab 05 reference solution: homogeneous transforms, inverses and frame chains."""

from __future__ import annotations

from functools import reduce

import numpy as np

from labs.manipulators.lab01_rotations.solution import is_rotation_matrix


def make_transform(R, p) -> np.ndarray:
    """4x4 T = [[R, p], [0, 1]]."""
    T = np.eye(4)
    T[:3, :3] = np.asarray(R, dtype=float)
    T[:3, 3] = np.asarray(p, dtype=float)
    return T


def split_transform(T):
    """(R, p) from a 4x4 transform."""
    T = np.asarray(T, dtype=float)
    return T[:3, :3].copy(), T[:3, 3].copy()


def is_transform(T, tol: float = 1e-6) -> bool:
    T = np.asarray(T, dtype=float)
    return (T.shape == (4, 4) and is_rotation_matrix(T[:3, :3], tol)
            and np.allclose(T[3], [0, 0, 0, 1], atol=tol))


def transform_inverse(T) -> np.ndarray:
    """Closed form: T^-1 = [[R^T, -R^T p], [0, 1]] (no general matrix inverse)."""
    R, p = split_transform(T)
    return make_transform(R.T, -R.T @ p)


def transform_points(T, points) -> np.ndarray:
    """Apply T to one point (3,) or many points (N, 3). Returns the same shape."""
    P = np.asarray(points, dtype=float)
    R, p = split_transform(T)
    return P @ R.T + p


def chain(*transforms) -> np.ndarray:
    """T_0n = T_01 @ T_12 @ ... (identity for no arguments)."""
    return reduce(np.matmul, transforms, np.eye(4))


def relative_transform(T_wa, T_wb) -> np.ndarray:
    """Pose of b seen from a: T_ab = T_wa^-1 @ T_wb."""
    return transform_inverse(T_wa) @ np.asarray(T_wb, dtype=float)
