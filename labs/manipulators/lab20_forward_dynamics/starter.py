"""Lab 20: forward dynamics: integrate M qdd = tau - C qd - g yourself, compare with MuJoCo.

f(q, qd, tau) -> qdd is the "dynamics function" the integrators step. Build it with
forward_dynamics from lab 18's closed forms (2R arm) or lab 19's RNEA (any arm), e.g.
    f = lambda q, qd, tau: forward_dynamics(M_fn, bias_fn, q, qd, tau)
"""

from __future__ import annotations

import numpy as np


def forward_dynamics(mass_fn, bias_fn, q, qd, tau) -> np.ndarray:
    """qdd = M(q)^-1 (tau - bias(q, qd)) with mass_fn(q) -> M, bias_fn(q, qd) -> C qd + g.
    Use np.linalg.solve."""
    # TODO: README step 1
    raise NotImplementedError("forward dynamics")


def explicit_euler_step(f, q, qd, dt, tau):
    """(q + dt qd, qd + dt f(q, qd, tau))."""
    # TODO: README step 3
    raise NotImplementedError("explicit Euler")


def semi_implicit_euler_step(f, q, qd, dt, tau):
    """Velocity first, then position with the NEW velocity."""
    # TODO
    raise NotImplementedError("semi-implicit Euler")


def rk4_step(f, q, qd, dt, tau):
    """Classical RK4 on x = (q, qd), x' = (qd, f(q, qd, tau)), tau constant over the step."""
    # TODO
    raise NotImplementedError("RK4")


STEPPERS = {"euler": "explicit_euler_step", "semi_implicit": "semi_implicit_euler_step",
            "rk4": "rk4_step"}  # method name -> function name (look it up with globals())


def simulate(f, q0, qd0, dt, steps, method: str = "rk4", tau_fn=None):
    """(Q, Qd), each (steps + 1, n), row 0 = initial state. Each step k: tau = tau_fn(k dt, q, qd)
    (once per step; None = zeros), then one step of the chosen integrator."""
    # TODO
    raise NotImplementedError("simulation loop")


def simulate_mujoco(model, q0, qd0, steps, tau_fn=None):
    """Same experiment in MuJoCo: data = MjData(model); set qpos, qvel; each step put
    tau_fn(k * model.opt.timestep, qpos copy, qvel copy) (or 0) into data.qfrc_applied, then
    mj_step. Return (Q, Qd) of copies, like simulate. Import mujoco inside the function."""
    # TODO: README step 6
    raise NotImplementedError("MuJoCo run")


def energy_drift(energy_fn, Q, Qd) -> np.ndarray:
    """E(Q[k], Qd[k]) - E(Q[0], Qd[0]) for every k."""
    # TODO: README step 5
    raise NotImplementedError("energy drift")


def convergence_order(errors, dts) -> float:
    """Least-squares slope of log(errors) against log(dts) (np.polyfit, degree 1)."""
    # TODO: README step 4
    raise NotImplementedError("order of accuracy")
