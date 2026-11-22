"""Lab 11 reference solution: resolved-rate control along a straight line."""

from __future__ import annotations

import numpy as np

from labs.manipulators.lab03_axis_angle.solution import log_so3


def quintic_time_scaling(t: float, T: float):
    """s(t) = 10 tau^3 - 15 tau^4 + 6 tau^5 (tau = t/T, clipped to [0, 1]) and ds/dt."""
    tau = float(np.clip(t / T, 0.0, 1.0))
    s = 10 * tau**3 - 15 * tau**4 + 6 * tau**5
    sdot = (30 * tau**2 - 60 * tau**3 + 30 * tau**4) / T
    if t < 0 or t > T:
        sdot = 0.0
    return s, sdot


def straight_line_reference(p0, p1, t: float, T: float):
    """(position, velocity) on the segment p0 -> p1 at time t."""
    p0, p1 = np.asarray(p0, dtype=float), np.asarray(p1, dtype=float)
    s, sdot = quintic_time_scaling(t, T)
    return p0 + s * (p1 - p0), sdot * (p1 - p0)


def dls_inverse(J, damping: float) -> np.ndarray:
    """Damped least-squares inverse J^T (J J^T + lambda^2 I)^-1."""
    J = np.asarray(J, dtype=float)
    m = J.shape[0]
    return J.T @ np.linalg.solve(J @ J.T + damping**2 * np.eye(m), np.eye(m))


def pose_error(T_des, T) -> np.ndarray:
    """6-vector [position error; orientation error], both in world axes.

    e_p = p_des - p,  e_w = log(R_des R^T) (rotation vector taking R to R_des, world frame).
    """
    T_des, T = np.asarray(T_des), np.asarray(T)
    e_p = T_des[:3, 3] - T[:3, 3]
    e_w = log_so3(T_des[:3, :3] @ T[:3, :3].T)
    return np.concatenate([e_p, e_w])


def resolved_rate_qdot(J, v_ff, err, gain: float, damping: float) -> np.ndarray:
    """qdot = J_dls^+ (v_ff + gain * err). J, v_ff, err all ordered [linear; angular]."""
    return dls_inverse(J, damping) @ (np.asarray(v_ff) + gain * np.asarray(err))


def run_straight_line(sim, p_goal, duration: float = 2.0, dt: float = 0.01,
                      gain: float = 20.0, damping: float = 0.01, settle: float = 0.5):
    """Move the end effector from its current position to p_goal in a straight line,
    keeping the starting orientation. Returns a dict of logged arrays."""
    T0 = sim.ee_pose()
    p0, R0 = T0[:3, 3].copy(), T0[:3, :3].copy()
    steps = int(round((duration + settle) / dt))
    ts, ps, qs, rot_err = [], [], [], []
    for k in range(steps + 1):
        t = k * dt
        p_ref, v_ref = straight_line_reference(p0, p_goal, t, duration)
        T_ref = np.eye(4)
        T_ref[:3, :3], T_ref[:3, 3] = R0, p_ref
        T = sim.ee_pose()
        ts.append(t)
        ps.append(T[:3, 3].copy())
        qs.append(sim.q)
        rot_err.append(np.linalg.norm(log_so3(R0 @ T[:3, :3].T)))
        if k == steps:
            break
        v_ff = np.concatenate([v_ref, np.zeros(3)])
        qdot = resolved_rate_qdot(sim.jacobian(), v_ff, pose_error(T_ref, T), gain, damping)
        sim.step(qdot, dt)
    return {"t": np.array(ts), "p": np.array(ps), "q": np.array(qs),
            "rot_err": np.array(rot_err), "p0": p0, "p1": np.asarray(p_goal, dtype=float)}


def path_deviation(points, p0, p1) -> np.ndarray:
    """Distance of each point to the segment p0-p1."""
    P = np.atleast_2d(np.asarray(points, dtype=float))
    p0, p1 = np.asarray(p0, dtype=float), np.asarray(p1, dtype=float)
    d = p1 - p0
    s = np.clip((P - p0) @ d / (d @ d), 0.0, 1.0)
    return np.linalg.norm(P - (p0 + s[:, None] * d), axis=1)
