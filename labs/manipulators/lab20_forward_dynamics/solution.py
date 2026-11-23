"""Lab 20 reference solution: forward dynamics and your own integrators, compared with MuJoCo."""

from __future__ import annotations

import numpy as np


def forward_dynamics(mass_fn, bias_fn, q, qd, tau) -> np.ndarray:
    """qdd = M(q)^-1 (tau - C(q, qd) qd - g(q)), by a linear solve (M is SPD; never invert)."""
    return np.linalg.solve(mass_fn(q), np.asarray(tau, dtype=float) - bias_fn(q, qd))


def explicit_euler_step(f, q, qd, dt, tau):
    """q+ = q + dt qd,  qd+ = qd + dt f(q, qd, tau): both from the OLD state."""
    return q + dt * qd, qd + dt * f(q, qd, tau)


def semi_implicit_euler_step(f, q, qd, dt, tau):
    """qd+ = qd + dt f(q, qd, tau), then q+ = q + dt qd+ (new velocity). MuJoCo's "Euler"."""
    qd_new = qd + dt * f(q, qd, tau)
    return q + dt * qd_new, qd_new


def rk4_step(f, q, qd, dt, tau):
    """Classical 4th-order Runge-Kutta on x = (q, qd), x' = (qd, f(q, qd, tau)); tau held constant."""
    k1q, k1v = qd, f(q, qd, tau)
    k2q, k2v = qd + 0.5 * dt * k1v, f(q + 0.5 * dt * k1q, qd + 0.5 * dt * k1v, tau)
    k3q, k3v = qd + 0.5 * dt * k2v, f(q + 0.5 * dt * k2q, qd + 0.5 * dt * k2v, tau)
    k4q, k4v = qd + dt * k3v, f(q + dt * k3q, qd + dt * k3v, tau)
    return (q + dt / 6 * (k1q + 2 * k2q + 2 * k3q + k4q),
            qd + dt / 6 * (k1v + 2 * k2v + 2 * k3v + k4v))


STEPPERS = {"euler": explicit_euler_step, "semi_implicit": semi_implicit_euler_step, "rk4": rk4_step}


def simulate(f, q0, qd0, dt, steps, method: str = "rk4", tau_fn=None):
    """Integrate from (q0, qd0). tau_fn(t, q, qd) -> tau, evaluated once per step and held
    (zero-order hold, like a digital controller); None means zero torque.
    Returns (Q, Qd), each (steps + 1, n), row 0 = the initial state."""
    step = STEPPERS[method]
    q, qd = np.array(q0, dtype=float), np.array(qd0, dtype=float)
    Q, Qd = [q], [qd]
    for k in range(steps):
        tau = np.zeros_like(q) if tau_fn is None else np.asarray(tau_fn(k * dt, q, qd), dtype=float)
        q, qd = step(f, q, qd, dt, tau)
        Q.append(q)
        Qd.append(qd)
    return np.array(Q), np.array(Qd)


def simulate_mujoco(model, q0, qd0, steps, tau_fn=None):
    """The same experiment in MuJoCo (its integrator and timestep come from the model). The torque
    goes into data.qfrc_applied before each mj_step. Returns (Q, Qd) like simulate."""
    import mujoco
    data = mujoco.MjData(model)
    data.qpos[:], data.qvel[:] = q0, qd0
    dt = model.opt.timestep
    Q, Qd = [data.qpos.copy()], [data.qvel.copy()]
    for k in range(steps):
        data.qfrc_applied[:] = 0.0 if tau_fn is None else tau_fn(k * dt, data.qpos.copy(),
                                                                  data.qvel.copy())
        mujoco.mj_step(model, data)
        Q.append(data.qpos.copy())
        Qd.append(data.qvel.copy())
    return np.array(Q), np.array(Qd)


def energy_drift(energy_fn, Q, Qd) -> np.ndarray:
    """E(t_k) - E(t_0) for every sample; energy_fn(q, qd) returns the total energy."""
    E = np.array([energy_fn(q, qd) for q, qd in zip(Q, Qd)])
    return E - E[0]


def convergence_order(errors, dts) -> float:
    """Slope of log(error) vs log(dt) (least squares): ~1 for Euler, ~4 for RK4."""
    return float(np.polyfit(np.log(dts), np.log(errors), 1)[0])
