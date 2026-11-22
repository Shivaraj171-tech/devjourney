"""Lab 04: unit quaternions. Convention: q = [w, x, y, z] (scalar first, as in MuJoCo)."""

from __future__ import annotations

import numpy as np


def quat_normalize(q) -> np.ndarray:
    """q / |q|. Raise ValueError for a (near) zero quaternion."""
    # TODO
    raise NotImplementedError("normalise q")


def quat_multiply(q1, q2) -> np.ndarray:
    """Hamilton product q1 * q2."""
    # TODO: (w1, v1)(w2, v2) = (w1 w2 - v1.v2,  w1 v2 + w2 v1 + v1 x v2)
    raise NotImplementedError("Hamilton product")


def quat_conjugate(q) -> np.ndarray:
    """(w, -v). For a unit quaternion this is the inverse."""
    # TODO
    raise NotImplementedError("conjugate")


def quat_from_axis_angle(axis, theta: float) -> np.ndarray:
    """Unit quaternion for a rotation by theta about axis (normalise the axis)."""
    # TODO: note the HALF angle.
    raise NotImplementedError("axis-angle -> quaternion")


def quat_rotate(q, v) -> np.ndarray:
    """Rotate 3-vector v by unit quaternion q (sandwich product)."""
    # TODO: embed v as the pure quaternion (0, v), compute q * p * q^-1, drop the scalar.
    raise NotImplementedError("rotate a vector")


def quat_to_matrix(q) -> np.ndarray:
    """3x3 rotation matrix of q."""
    # TODO: see README step 4 (or build it column by column with quat_rotate).
    raise NotImplementedError("quaternion -> matrix")


def matrix_to_quat(R) -> np.ndarray:
    """Rotation matrix -> unit quaternion with w >= 0 (Shepperd's method)."""
    # TODO: pick the largest of trace, R00, R11, R22 to avoid dividing by ~0.
    raise NotImplementedError("matrix -> quaternion")


def quat_slerp(q0, q1, t: float) -> np.ndarray:
    """Spherical linear interpolation along the SHORTER arc, t in [0, 1]."""
    # TODO: if q0.q1 < 0 flip q1; if nearly parallel, normalised lerp; else the sin formula.
    raise NotImplementedError("slerp")
