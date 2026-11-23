"""Lab 21: independent joint PD control: step responses, gains vs overshoot, gravity droop.

A controller is any function controller(t, q, qd) -> tau. The same function drives:
  - the numpy simulator from lab 20: toolbox.simulate(f, q0, qd0, dt, steps, "rk4", controller)
  - MuJoCo, through run_mujoco_control below (models with torque motors: toolbox.models.with_motors)
"""

from __future__ import annotations

import numpy as np


def pd_torque(q, qd, q_des, Kp, Kd, qd_des=None) -> np.ndarray:
    """tau = Kp (q_des - q) + Kd (qd_des - qd). Kp, Kd: scalars or per-joint arrays;
    qd_des None means zero (a set-point, not a trajectory)."""
    # TODO: README step 1
    raise NotImplementedError("PD torque")


def pd_gains(inertia: float, wn: float, zeta: float):
    """(kp, kd) giving J qdd + kd qd + kp q = 0 natural frequency wn and damping ratio zeta."""
    # TODO: README step 2
    raise NotImplementedError("PD gains")


def overshoot_from_zeta(zeta: float) -> float:
    """Peak overshoot as a fraction of the step (0 for zeta >= 1)."""
    # TODO: README step 3
    raise NotImplementedError("overshoot formula")


def settling_time_estimate(wn: float, zeta: float) -> float:
    """2% settling time from the envelope: exp(-zeta wn t) = 0.02."""
    # TODO: README step 3
    raise NotImplementedError("settling time estimate")


def step_metrics(t, y, y_start: float, y_target: float, band: float = 0.02) -> dict:
    """{"overshoot", "rise_time", "settling_time", "ss_error"} of a step response (README step 4).
    Normalise first: r = (y - y_start) / (y_target - y_start) goes from 0 to 1."""
    # TODO: README step 4
    raise NotImplementedError("step metrics")


def gravity_droop(q_des, Kp, g_fn, iters: int = 100) -> np.ndarray:
    """Rest position of PD alone under gravity: solve Kp (q_des - q) = g(q) by fixed-point
    iteration q <- q_des - g(q) / Kp, starting from q_des (README step 5)."""
    # TODO: README step 5
    raise NotImplementedError("gravity droop")


def run_mujoco_control(model, controller, q0, duration: float, qd0=None, before_step=None):
    """Closed loop in MuJoCo (README step 6). n = model.nu motors drive the first n joints.
    New MjData; qpos[:n] = q0 (qvel[:n] = qd0 if given); mj_forward. Then for k in range(N),
    N = round(duration / dt): tau = controller(k dt, q copy, qd copy); data.ctrl[:n] = tau;
    before_step(model, data, k dt) if given; mj_step; record.
    Returns (t (N+1,), Q (N+1, n), Qd (N+1, n), Tau (N, n)). Import mujoco inside."""
    # TODO: README step 6
    raise NotImplementedError("MuJoCo control loop")
