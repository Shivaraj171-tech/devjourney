"""Lab 12 reference solution: closed-form inverse kinematics of the 3-DOF arm (position only)."""

from __future__ import annotations

import numpy as np

from labs.manipulators.lab06_dh_fk.solution import fk_dh
from labs.manipulators.toolbox.robots import ARM3_A2, ARM3_A3, ARM3_D1, ARM3_DH


def wrap_to_pi(q):
    """Angles wrapped to (-pi, pi]."""
    q = np.asarray(q, dtype=float)
    w = np.mod(q + np.pi, 2 * np.pi) - np.pi
    return np.where(w <= -np.pi, w + 2 * np.pi, w)


def planar2r_ik(r: float, s: float, a2: float, a3: float, elbow_sign: int):
    """(q2, q3) placing the 2R tip at (r, s), or None if unreachable.

    cos q3 = (r^2 + s^2 - a2^2 - a3^2) / (2 a2 a3), q3 = elbow_sign * acos(.),
    q2 = atan2(s, r) - atan2(a3 sin q3, a2 + a3 cos q3).
    """
    c3 = (r * r + s * s - a2 * a2 - a3 * a3) / (2 * a2 * a3)
    if abs(c3) > 1 + 1e-12:
        return None
    c3 = float(np.clip(c3, -1.0, 1.0))
    q3 = elbow_sign * np.arctan2(np.sqrt(1 - c3 * c3), c3)
    q2 = np.arctan2(s, r) - np.arctan2(a3 * np.sin(q3), a2 + a3 * np.cos(q3))
    return float(q2), float(q3)


def elbow_is_up(q) -> bool:
    """True if the elbow lies above the shoulder-to-wrist line (seen in the arm's vertical plane).

    In the plane spanned by world z and the horizontal direction towards the tip, with the
    shoulder at the origin: the elbow is "up" when it is counter-clockwise from the tip vector,
    i.e. cross(tip, elbow) > 0.
    """
    q1, q2, q3 = q
    elbow = np.array([ARM3_A2 * np.cos(q2), ARM3_A2 * np.sin(q2)])          # (r, s) of the elbow
    tip = elbow + ARM3_A3 * np.array([np.cos(q2 + q3), np.sin(q2 + q3)])
    # if the tip is "behind" (r < 0), the outward horizontal axis is -r: mirror both points
    if tip[0] < 0:
        elbow, tip = elbow * [-1, 1], tip * [-1, 1]
    return bool(tip[0] * elbow[1] - tip[1] * elbow[0] > 0)


def arm3_ik_all(p) -> dict:
    """All closed-form solutions for the position p, keyed ("front"|"back", "up"|"down").

    front: q1 = atan2(y, x) (the arm faces the target), r = +rho;
    back:  q1 = atan2(y, x) + pi, r = -rho (it reaches over its own head).
    On the base axis (rho = 0) q1 is arbitrary; we use q1 = 0. Unreachable -> {}.
    Angles are wrapped to (-pi, pi].
    """
    x, y, z = np.asarray(p, dtype=float)
    rho = np.hypot(x, y)
    phi = np.arctan2(y, x) if rho > 1e-12 else 0.0
    s = z - ARM3_D1
    out = {}
    for shoulder, q1, r in (("front", phi, rho), ("back", phi + np.pi, -rho)):
        for sign in (+1, -1):
            sol = planar2r_ik(r, s, ARM3_A2, ARM3_A3, sign)
            if sol is None:
                continue
            q = wrap_to_pi([q1, *sol])
            out[(shoulder, "up" if elbow_is_up(q) else "down")] = q
    return out


def arm3_ik(p, shoulder: str = "front", elbow: str = "up"):
    """One named solution, or None if unreachable."""
    return arm3_ik_all(p).get((shoulder, elbow))


def is_reachable(p) -> bool:
    """|a2 - a3| <= distance(shoulder, p) <= a2 + a3."""
    x, y, z = np.asarray(p, dtype=float)
    dist = np.sqrt(x * x + y * y + (z - ARM3_D1) ** 2)
    return bool(abs(ARM3_A2 - ARM3_A3) - 1e-12 <= dist <= ARM3_A2 + ARM3_A3 + 1e-12)


def fk_position_error(q, p) -> float:
    """|fk(q) - p| using the DH forward kinematics: always verify an IK answer with FK."""
    return float(np.linalg.norm(fk_dh(ARM3_DH, q)[:3, 3] - np.asarray(p, dtype=float)))
