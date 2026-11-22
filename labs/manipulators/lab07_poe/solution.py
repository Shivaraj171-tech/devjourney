"""Lab 07 reference solution: twists, exp/log on SE(3), product-of-exponentials FK.

Twist convention (Lynch & Park, "Modern Robotics"): S = (omega, v), angular part first.
Screw lists are 6 x n arrays, one screw axis per COLUMN (same layout as a Jacobian).
"""

from __future__ import annotations

import numpy as np

from labs.manipulators.lab01_rotations.solution import skew, vee
from labs.manipulators.lab03_axis_angle.solution import exp_so3, log_so3
from labs.manipulators.lab05_transforms.solution import make_transform, transform_inverse
from labs.manipulators.lab06_dh_fk.solution import fk_dh_frames


def twist_to_matrix(S) -> np.ndarray:
    """6-vector (omega, v) -> 4x4 se(3) matrix [[ [omega], v ], [0, 0]]."""
    S = np.asarray(S, dtype=float)
    out = np.zeros((4, 4))
    out[:3, :3] = skew(S[:3])
    out[:3, 3] = S[3:]
    return out


def matrix_to_twist(Smat) -> np.ndarray:
    Smat = np.asarray(Smat, dtype=float)
    return np.concatenate([vee(Smat[:3, :3]), Smat[:3, 3]])


def adjoint(T) -> np.ndarray:
    """6x6 Ad_T = [[R, 0], [[p] R, R]], so that [Ad_T S] = T [S] T^-1."""
    T = np.asarray(T, dtype=float)
    R, p = T[:3, :3], T[:3, 3]
    Ad = np.zeros((6, 6))
    Ad[:3, :3] = R
    Ad[3:, 3:] = R
    Ad[3:, :3] = skew(p) @ R
    return Ad


def exp_se3(S, theta: float) -> np.ndarray:
    """exp([S] theta). S need not be normalised; handles pure translations (omega = 0)."""
    S = np.asarray(S, dtype=float)
    w, v = S[:3], S[3:]
    wn = np.linalg.norm(w)
    if wn < 1e-12:
        return make_transform(np.eye(3), v * theta)
    w_hat, v_hat, th = w / wn, v / wn, theta * wn  # rescale so the rotation axis is unit
    W = skew(w_hat)
    G = np.eye(3) * th + (1 - np.cos(th)) * W + (th - np.sin(th)) * (W @ W)
    return make_transform(exp_so3(w_hat * th), G @ v_hat)


def log_se3(T) -> np.ndarray:
    """6-vector S*theta with exp_se3(S*theta, 1) == T."""
    T = np.asarray(T, dtype=float)
    R, p = T[:3, :3], T[:3, 3]
    w = log_so3(R)
    th = np.linalg.norm(w)
    if th < 1e-9:
        return np.concatenate([np.zeros(3), p])
    W = skew(w / th)
    G_inv = (np.eye(3) / th - W / 2
             + (1 / th - 1 / (2 * np.tan(th / 2))) * (W @ W))
    return np.concatenate([w, (G_inv @ p) * th])


def revolute_screw(axis, point) -> np.ndarray:
    """Screw axis of a revolute joint: unit axis omega through point q -> (omega, -omega x q)."""
    w = np.asarray(axis, dtype=float)
    w = w / np.linalg.norm(w)
    return np.concatenate([w, -np.cross(w, np.asarray(point, dtype=float))])


def fk_space(M, Slist, q) -> np.ndarray:
    """T(q) = e^[S1]q1 ... e^[Sn]qn M (space-frame screw axes)."""
    T = np.eye(4)
    for i, qi in enumerate(q):
        T = T @ exp_se3(Slist[:, i], qi)
    return T @ M


def fk_body(M, Blist, q) -> np.ndarray:
    """T(q) = M e^[B1]q1 ... e^[Bn]qn (body-frame screw axes)."""
    T = np.asarray(M, dtype=float).copy()
    for i, qi in enumerate(q):
        T = T @ exp_se3(Blist[:, i], qi)
    return T


def screws_from_dh(dh):
    """(M, Slist) for the same arm: zero-config pose and space screw axes read off the DH frames.

    At q = 0, joint i spins about z of DH frame i-1, through that frame's origin.
    """
    frames = fk_dh_frames(dh, np.zeros(len(dh)))
    Slist = np.column_stack([revolute_screw(T[:3, 2], T[:3, 3]) for T in frames[:-1]])
    return frames[-1], Slist


def body_screws(M, Slist) -> np.ndarray:
    """B_i = Ad_{M^-1} S_i."""
    return adjoint(transform_inverse(M)) @ Slist
