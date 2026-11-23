"""Lab 23 reference solution: computed-torque (inverse dynamics) control along a quintic, and its
robustness to a wrong mass model."""

from __future__ import annotations

import numpy as np

from labs.manipulators.lab16_time_scaling.solution import quintic_scaling


def critically_damped_gains(wn: float):
    """(Kp, Kd) = (wn^2, 2 wn) for the error dynamics e'' + Kd e' + Kp e = 0 (zeta = 1).
    Units 1/s^2 and 1/s: these gains act on accelerations, M(q) turns them into torques."""
    return wn**2, 2.0 * wn


def quintic_reference(q0, q1, T: float):
    """ref(t) -> (q_d, qd_d, qdd_d): rest-to-rest straight line in joint space with quintic timing
    (lab 16), holding q1 after T."""
    q0, q1 = np.asarray(q0, dtype=float), np.asarray(q1, dtype=float)
    D = q1 - q0

    def ref(t):
        s, sd, sdd = quintic_scaling(t, T)
        return q0 + s * D, sd * D, sdd * D

    return ref


def computed_torque(q, qd, ref, Kp, Kd, mass_fn, bias_fn) -> np.ndarray:
    """tau = M(q) (qdd_d + Kd (qd_d - qd) + Kp (q_d - q)) + C(q, qd) qd + g(q),
    ref = (q_d, qd_d, qdd_d); bias_fn(q, qd) returns C qd + g."""
    q, qd = np.asarray(q, dtype=float), np.asarray(qd, dtype=float)
    q_d, qd_d, qdd_d = (np.asarray(x, dtype=float) for x in ref)
    v = qdd_d + np.asarray(Kd) * (qd_d - qd) + np.asarray(Kp) * (q_d - q)
    return mass_fn(q) @ v + bias_fn(q, qd)


def pd_gravity_tracking(q, qd, ref, Kp, Kd, g_fn) -> np.ndarray:
    """The baseline: tau = Kp (q_d - q) + Kd (qd_d - qd) + g(q). No model of inertia."""
    q, qd = np.asarray(q, dtype=float), np.asarray(qd, dtype=float)
    q_d, qd_d, _ = (np.asarray(x, dtype=float) for x in ref)
    return np.asarray(Kp) * (q_d - q) + np.asarray(Kd) * (qd_d - qd) + g_fn(q)


def error_response(e0, ed0, wn: float, t):
    """Exact error of e'' + 2 wn e' + wn^2 e = 0: e(t) = (e0 + (ed0 + wn e0) t) exp(-wn t).
    Returns an array (len(t), n)."""
    e0, ed0 = np.asarray(e0, dtype=float), np.asarray(ed0, dtype=float)
    t = np.asarray(t, dtype=float)[:, None]
    return (e0 + (ed0 + wn * e0) * t) * np.exp(-wn * t)


def scaled_model_offset(q, delta: float, Kp, mass_fn, g_fn) -> np.ndarray:
    """Rest error e = q_d - q when the controller's masses are all (1 + delta) times the truth.

    M, C and g are linear in the masses, so the model is (1 + delta) M, (1 + delta) b, and the
    closed loop becomes e'' + (1 + delta)(Kd e' + Kp e) = -delta (qdd_d + M^-1 b). At rest
    (qdd_d = 0, b = g): e = -delta / ((1 + delta) Kp) M(q)^-1 g(q)."""
    q = np.asarray(q, dtype=float)
    return -delta / ((1 + delta) * np.asarray(Kp)) * np.linalg.solve(mass_fn(q), g_fn(q))


def scale_masses(p: dict, factor: float) -> dict:
    """A copy of a 2R parameter dict with m1, m2, I1, I2 multiplied by factor (geometry kept)."""
    out = dict(p)
    for k in ("m1", "m2", "I1", "I2"):
        out[k] = p[k] * factor
    return out


def scale_links(links, factor: float):
    """DH-arm link rows (mass, com, inertia) with mass and inertia multiplied by factor."""
    return tuple((m * factor, com, tuple(np.asarray(inertia, dtype=float) * factor))
                 for m, com, inertia in links)


def tracking_error(Q, Q_ref) -> float:
    """max_k |Q[k] - Q_ref[k]| (Euclidean norm over joints, worst sample)."""
    return float(np.max(np.linalg.norm(np.asarray(Q) - np.asarray(Q_ref), axis=1)))
