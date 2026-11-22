"""Lab 04 reference solution: unit quaternions, convention q = [w, x, y, z] (as in MuJoCo)."""

from __future__ import annotations

import numpy as np


def quat_normalize(q) -> np.ndarray:
    q = np.asarray(q, dtype=float)
    n = np.linalg.norm(q)
    if n < 1e-12:
        raise ValueError("cannot normalise a zero quaternion")
    return q / n


def quat_multiply(q1, q2) -> np.ndarray:
    """Hamilton product q1 * q2 (apply q2 first, then q1, when used as rotations)."""
    w1, v1 = q1[0], np.asarray(q1[1:], dtype=float)
    w2, v2 = q2[0], np.asarray(q2[1:], dtype=float)
    w = w1 * w2 - v1 @ v2
    v = w1 * v2 + w2 * v1 + np.cross(v1, v2)
    return np.concatenate([[w], v])


def quat_conjugate(q) -> np.ndarray:
    q = np.asarray(q, dtype=float)
    return np.concatenate([[q[0]], -q[1:]])


def quat_from_axis_angle(axis, theta: float) -> np.ndarray:
    k = np.asarray(axis, dtype=float)
    k = k / np.linalg.norm(k)
    return np.concatenate([[np.cos(theta / 2)], np.sin(theta / 2) * k])


def quat_rotate(q, v) -> np.ndarray:
    """Rotate 3-vector v by unit quaternion q: v' = q * (0, v) * q^-1."""
    p = np.concatenate([[0.0], np.asarray(v, dtype=float)])
    return quat_multiply(quat_multiply(q, p), quat_conjugate(q))[1:]


def quat_to_matrix(q) -> np.ndarray:
    w, x, y, z = quat_normalize(q)
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
        [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
        [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
    ])


def matrix_to_quat(R) -> np.ndarray:
    """Shepperd's method: divide by the largest of 4w^2, 4x^2, 4y^2, 4z^2. Returns w >= 0."""
    R = np.asarray(R, dtype=float)
    tr = np.trace(R)
    cands = [tr, R[0, 0], R[1, 1], R[2, 2]]
    i = int(np.argmax(cands))
    if i == 0:
        s = 2.0 * np.sqrt(1.0 + tr)  # s = 4w
        q = [s / 4, (R[2, 1] - R[1, 2]) / s, (R[0, 2] - R[2, 0]) / s, (R[1, 0] - R[0, 1]) / s]
    elif i == 1:
        s = 2.0 * np.sqrt(1.0 + R[0, 0] - R[1, 1] - R[2, 2])  # s = 4x
        q = [(R[2, 1] - R[1, 2]) / s, s / 4, (R[0, 1] + R[1, 0]) / s, (R[0, 2] + R[2, 0]) / s]
    elif i == 2:
        s = 2.0 * np.sqrt(1.0 - R[0, 0] + R[1, 1] - R[2, 2])  # s = 4y
        q = [(R[0, 2] - R[2, 0]) / s, (R[0, 1] + R[1, 0]) / s, s / 4, (R[1, 2] + R[2, 1]) / s]
    else:
        s = 2.0 * np.sqrt(1.0 - R[0, 0] - R[1, 1] + R[2, 2])  # s = 4z
        q = [(R[1, 0] - R[0, 1]) / s, (R[0, 2] + R[2, 0]) / s, (R[1, 2] + R[2, 1]) / s, s / 4]
    q = quat_normalize(q)
    return -q if q[0] < 0 else q


def quat_slerp(q0, q1, t: float) -> np.ndarray:
    """Spherical linear interpolation along the shorter arc, t in [0, 1]."""
    q0, q1 = quat_normalize(q0), quat_normalize(q1)
    d = float(q0 @ q1)
    if d < 0.0:  # q and -q are the same rotation: take the short way round
        q1, d = -q1, -d
    if d > 1.0 - 1e-9:  # nearly parallel: linear interpolation is exact enough
        return quat_normalize((1 - t) * q0 + t * q1)
    omega = np.arccos(d)
    return (np.sin((1 - t) * omega) * q0 + np.sin(t * omega) * q1) / np.sin(omega)
