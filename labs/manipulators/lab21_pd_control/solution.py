"""Lab 21 reference solution: independent joint PD control, step responses, gravity droop."""

from __future__ import annotations

import numpy as np


def pd_torque(q, qd, q_des, Kp, Kd, qd_des=None) -> np.ndarray:
    """tau = Kp (q_des - q) + Kd (qd_des - qd), joint by joint (Kp, Kd scalars or per-joint arrays)."""
    q, qd, q_des = (np.asarray(x, dtype=float) for x in (q, qd, q_des))
    qd_des = np.zeros_like(qd) if qd_des is None else np.asarray(qd_des, dtype=float)
    return np.asarray(Kp) * (q_des - q) + np.asarray(Kd) * (qd_des - qd)


def pd_gains(inertia: float, wn: float, zeta: float):
    """(kp, kd) that give J qdd + kd qd + kp q = 0 the natural frequency wn and damping ratio zeta:
    kp = J wn^2, kd = 2 zeta wn J."""
    return inertia * wn**2, 2 * zeta * wn * inertia


def overshoot_from_zeta(zeta: float) -> float:
    """Peak overshoot of a second-order step response, as a fraction of the step:
    exp(-zeta pi / sqrt(1 - zeta^2)) for zeta < 1, else 0."""
    if zeta >= 1:
        return 0.0
    return float(np.exp(-zeta * np.pi / np.sqrt(1 - zeta**2)))


def settling_time_estimate(wn: float, zeta: float) -> float:
    """2% settling time from the decay envelope exp(-zeta wn t) = 0.02: about 4 / (zeta wn)."""
    return float(-np.log(0.02) / (zeta * wn))


def step_metrics(t, y, y_start: float, y_target: float, band: float = 0.02) -> dict:
    """Measure a step response y(t) from y_start towards y_target (either direction).

    Work with the normalised response r = (y - y_start) / (y_target - y_start), which goes 0 -> 1:
      overshoot     max(r) - 1, at least 0 (fraction of the step)
      rise_time     first time r >= 0.9 minus first time r >= 0.1 (nan if never reached)
      settling_time first time after which |r - 1| stays <= band (t[-1] if it never settles)
      ss_error      y_target - y[-1] (in the units of y)
    """
    t, y = np.asarray(t, dtype=float), np.asarray(y, dtype=float)
    r = (y - y_start) / (y_target - y_start)

    def first(cond):
        idx = np.flatnonzero(cond)
        return t[idx[0]] if idx.size else np.nan

    outside = np.flatnonzero(np.abs(r - 1) > band)
    if outside.size == 0:
        settle = t[0]
    elif outside[-1] == len(t) - 1:
        settle = t[-1]
    else:
        settle = t[outside[-1] + 1]
    return {"overshoot": float(max(r.max() - 1, 0.0)),
            "rise_time": float(first(r >= 0.9) - first(r >= 0.1)),
            "settling_time": float(settle),
            "ss_error": float(y_target - y[-1])}


def gravity_droop(q_des, Kp, g_fn, iters: int = 100) -> np.ndarray:
    """Where PD alone comes to rest under gravity. At rest qd = 0, so Kp (q_des - q) = g(q):
    iterate q <- q_des - Kp^-1 g(q) (a contraction when Kp is large compared with dg/dq)."""
    q_des = np.asarray(q_des, dtype=float)
    q = q_des.copy()
    for _ in range(iters):
        q = q_des - np.asarray(g_fn(q), dtype=float) / np.asarray(Kp, dtype=float)
    return q


def run_mujoco_control(model, controller, q0, duration: float, qd0=None, before_step=None):
    """Closed loop in MuJoCo with torque motors (one per arm joint, data.ctrl[:nu] = tau).

    Each step: read q, qd (the first nu joints), tau = controller(t, q, qd), write data.ctrl, call
    before_step(model, data, t) if given (disturbances, logging), then mj_step.
    Returns (t (N+1,), Q (N+1, nu), Qd (N+1, nu), Tau (N, nu)), with N = round(duration / dt).
    """
    import mujoco
    data = mujoco.MjData(model)
    n = model.nu
    data.qpos[:n] = q0
    if qd0 is not None:
        data.qvel[:n] = qd0
    mujoco.mj_forward(model, data)
    dt = model.opt.timestep
    steps = int(round(duration / dt))
    Q, Qd, Tau = [data.qpos[:n].copy()], [data.qvel[:n].copy()], []
    for k in range(steps):
        tau = np.asarray(controller(k * dt, data.qpos[:n].copy(), data.qvel[:n].copy()), dtype=float)
        data.ctrl[:n] = tau
        if before_step is not None:
            before_step(model, data, k * dt)
        mujoco.mj_step(model, data)
        Q.append(data.qpos[:n].copy())
        Qd.append(data.qvel[:n].copy())
        Tau.append(tau)
    return np.arange(steps + 1) * dt, np.array(Q), np.array(Qd), np.array(Tau)
