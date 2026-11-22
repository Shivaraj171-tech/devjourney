"""Lab 03 reference solution: axis-angle, Rodrigues' formula, exp and log on SO(3)."""

from __future__ import annotations

import numpy as np

from labs.manipulators.lab01_rotations.solution import skew, vee

SMALL = 1e-9


def rodrigues(axis, theta: float) -> np.ndarray:
    """R = I + sin(theta) [k] + (1 - cos(theta)) [k]^2 for a unit axis k (normalised here)."""
    k = np.asarray(axis, dtype=float)
    n = np.linalg.norm(k)
    if n < SMALL:
        raise ValueError("rotation axis must be non-zero (use exp_so3 for rotation vectors)")
    K = skew(k / n)
    return np.eye(3) + np.sin(theta) * K + (1.0 - np.cos(theta)) * (K @ K)


def exp_so3(omega) -> np.ndarray:
    """Matrix exponential of [omega] for a rotation vector omega = axis * angle."""
    omega = np.asarray(omega, dtype=float)
    theta = np.linalg.norm(omega)
    if theta < SMALL:
        return np.eye(3) + skew(omega)  # first-order; exact to O(theta^2)
    return rodrigues(omega / theta, theta)


def log_so3(R) -> np.ndarray:
    """Rotation vector omega (axis * angle, angle in [0, pi]) with exp_so3(omega) == R."""
    R = np.asarray(R, dtype=float)
    cos_theta = np.clip((np.trace(R) - 1.0) / 2.0, -1.0, 1.0)
    theta = np.arccos(cos_theta)
    if theta < 1e-7:
        return vee(R - R.T) / 2.0  # R ~ I + [w]
    if np.pi - theta < 1e-4:
        # sin(theta) ~ 0: use R + I = 2 k k^T (+ small skew part), pick the best-conditioned column
        B = (R + np.eye(3)) / 2.0
        i = int(np.argmax(np.diag(B)))
        k = B[:, i] / np.sqrt(B[i, i])
        k /= np.linalg.norm(k)
        # fix the sign with the (small) antisymmetric part when it is informative
        w_small = vee(R - R.T)
        if np.dot(w_small, k) < 0:
            k = -k
        return theta * k
    return theta / (2.0 * np.sin(theta)) * vee(R - R.T)


def axis_angle_from_matrix(R):
    """(unit axis, angle) with angle in [0, pi]. Axis is arbitrary (x) for the identity."""
    omega = log_so3(R)
    theta = float(np.linalg.norm(omega))
    if theta < SMALL:
        return np.array([1.0, 0.0, 0.0]), 0.0
    return omega / theta, theta
