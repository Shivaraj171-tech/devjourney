"""Lab 01: rotation matrices and SO(3).

Fill in every TODO. Run `python -m labs.manipulators check lab01` to test.
Read README.md in this folder first: it derives every formula you need.
"""

from __future__ import annotations

import numpy as np


def rot_x(theta: float) -> np.ndarray:
    """Rotation by ``theta`` radians about the x axis (3x3 array)."""
    # TODO: columns are the images of x, y, z. x stays put; y and z turn in the y-z plane.
    raise NotImplementedError("build the 3x3 matrix for a rotation about x")


def rot_y(theta: float) -> np.ndarray:
    """Rotation by ``theta`` radians about the y axis (3x3 array)."""
    # TODO: careful with the sign of the sin terms (z x x = y, so the cyclic order is z, x).
    raise NotImplementedError("build the 3x3 matrix for a rotation about y")


def rot_z(theta: float) -> np.ndarray:
    """Rotation by ``theta`` radians about the z axis (3x3 array)."""
    # TODO
    raise NotImplementedError("build the 3x3 matrix for a rotation about z")


def is_rotation_matrix(R, tol: float = 1e-6) -> bool:
    """True if R is 3x3, orthonormal (R^T R = I) and right-handed (det R = +1)."""
    # TODO: check the shape first, then R^T R ~ I (np.allclose with atol=tol), then det ~ +1.
    raise NotImplementedError("check the three SO(3) conditions")


def project_to_so3(M) -> np.ndarray:
    """Closest rotation matrix to M in the Frobenius norm (via SVD)."""
    # TODO: M = U S V^T. Replace S by I, but make sure the result has det +1
    # (flip the last singular direction if det(U V^T) < 0).
    raise NotImplementedError("project M onto SO(3) with the SVD")


def skew(w) -> np.ndarray:
    """3-vector -> 3x3 skew-symmetric matrix [w] with [w] @ v == cross(w, v)."""
    # TODO
    raise NotImplementedError("build [w]")


def vee(W) -> np.ndarray:
    """Inverse of skew: 3x3 skew-symmetric matrix -> 3-vector."""
    # TODO
    raise NotImplementedError("read w back out of [w]")


def relative_rotation(R_sa, R_sb) -> np.ndarray:
    """Orientation of frame b expressed in frame a (R_ab), given R_sa and R_sb."""
    # TODO: use the subscript cancellation rule R_ab = R_as R_sb, and R_as = R_sa^{-1}.
    raise NotImplementedError("compose R_as with R_sb")
