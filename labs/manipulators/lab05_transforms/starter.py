"""Lab 05: homogeneous transforms, inverses and frame chains."""

from __future__ import annotations

import numpy as np

from labs.manipulators.toolbox import is_rotation_matrix  # noqa: F401


def make_transform(R, p) -> np.ndarray:
    """4x4 T = [[R, p], [0, 1]]."""
    # TODO
    raise NotImplementedError("pack R and p into a 4x4")


def split_transform(T):
    """(R, p) from a 4x4 transform (return copies, not views)."""
    # TODO
    raise NotImplementedError("unpack T")


def is_transform(T, tol: float = 1e-6) -> bool:
    """4x4, top-left block in SO(3), bottom row [0, 0, 0, 1]."""
    # TODO
    raise NotImplementedError("check SE(3) membership")


def transform_inverse(T) -> np.ndarray:
    """Closed-form inverse [[R^T, -R^T p], [0, 1]]. Do NOT call np.linalg.inv."""
    # TODO
    raise NotImplementedError("closed-form inverse")


def transform_points(T, points) -> np.ndarray:
    """Apply T to one point (3,) or many points (N, 3); return the same shape."""
    # TODO: for rows of points, R @ p becomes P @ R.T (broadcast the translation).
    raise NotImplementedError("transform points")


def chain(*transforms) -> np.ndarray:
    """T_0n = T_01 @ T_12 @ ... ; identity when called with no arguments."""
    # TODO
    raise NotImplementedError("compose a chain of frames")


def relative_transform(T_wa, T_wb) -> np.ndarray:
    """Pose of frame b expressed in frame a."""
    # TODO: subscript cancellation again.
    raise NotImplementedError("T_ab from T_wa and T_wb")
