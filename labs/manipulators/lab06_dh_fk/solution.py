"""Lab 06 reference solution: Denavit-Hartenberg forward kinematics (standard DH)."""

from __future__ import annotations

import numpy as np

# DH table rows: (a, alpha, d, theta_offset). Shoulder height 0.30, upper arm 0.40, forearm 0.30.
ARM3_DH = np.array([
    [0.0, np.pi / 2, 0.30, 0.0],
    [0.40, 0.0, 0.0, 0.0],
    [0.30, 0.0, 0.0, 0.0],
])


def dh_transform(a: float, alpha: float, d: float, theta: float) -> np.ndarray:
    """T_{i-1,i} = Rz(theta) Tz(d) Tx(a) Rx(alpha)."""
    ct, st = np.cos(theta), np.sin(theta)
    ca, sa = np.cos(alpha), np.sin(alpha)
    return np.array([
        [ct, -st * ca, st * sa, a * ct],
        [st, ct * ca, -ct * sa, a * st],
        [0.0, sa, ca, d],
        [0.0, 0.0, 0.0, 1.0],
    ])


def fk_dh_frames(dh, q):
    """[T_00 = I, T_01, ..., T_0n]: every DH frame in the base frame."""
    dh = np.asarray(dh, dtype=float)
    q = np.asarray(q, dtype=float)
    if len(q) != len(dh):
        raise ValueError(f"expected {len(dh)} joint values, got {len(q)}")
    frames = [np.eye(4)]
    for (a, alpha, d, offset), qi in zip(dh, q):
        frames.append(frames[-1] @ dh_transform(a, alpha, d, qi + offset))
    return frames


def fk_dh(dh, q) -> np.ndarray:
    """End-effector pose T_0n."""
    return fk_dh_frames(dh, q)[-1]


def arm3_position(q) -> np.ndarray:
    """Closed-form end-effector position of ARM3 (derived by geometry in the README)."""
    q1, q2, q3 = q
    d1, a2, a3 = ARM3_DH[0, 2], ARM3_DH[1, 0], ARM3_DH[2, 0]
    r = a2 * np.cos(q2) + a3 * np.cos(q2 + q3)  # horizontal reach
    return np.array([np.cos(q1) * r, np.sin(q1) * r,
                     d1 + a2 * np.sin(q2) + a3 * np.sin(q2 + q3)])
