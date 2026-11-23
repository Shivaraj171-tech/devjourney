"""Lab 22: PD + gravity compensation: zero steady-state error, and why it is stable.

Toolbox: pd_torque (lab 21), rnea_model / gravity_rnea (lab 19). For the 2R arm, g(q) is
planar2r_gravity(q, PLANAR2R_DYN) from lab 18.
"""

from __future__ import annotations

import numpy as np

from labs.manipulators.toolbox import gravity_rnea, pd_torque, rnea_model  # noqa: F401


def pd_gravity(q, qd, q_des, Kp, Kd, g_fn) -> np.ndarray:
    """tau = Kp (q_des - q) - Kd qd + g(q), g evaluated at the CURRENT q (README step 1)."""
    # TODO: README step 1
    raise NotImplementedError("PD + gravity compensation")


def pd_gravity_desired(q, qd, q_des, Kp, Kd, g_fn) -> np.ndarray:
    """Same, but with the constant feedforward g(q_des) (README step 4)."""
    # TODO: README step 4
    raise NotImplementedError("PD + g(q_des)")


def make_gravity_fn(dh, links, gravity=(0.0, 0.0, -9.81)):
    """A function q -> g(q) for any DH arm, using lab 19's RNEA. Build rnea_model ONCE, outside
    the returned function (it runs every control step)."""
    # TODO: README step 2
    raise NotImplementedError("gravity function from RNEA")


def lyapunov(q, qd, q_des, Kp, mass_fn) -> float:
    """V = 1/2 qd^T M(q) qd + 1/2 e^T Kp e, e = q_des - q (Kp scalar or per-joint) (step 3)."""
    # TODO: README step 3
    raise NotImplementedError("Lyapunov function")


def lyapunov_rate(qd, Kd) -> float:
    """The predicted dV/dt = -qd^T Kd qd (step 3)."""
    # TODO: README step 3
    raise NotImplementedError("dV/dt")


def model_error_offset(q_des, Kp, g_true, g_model, iters: int = 100) -> np.ndarray:
    """Rest position with a wrong gravity model: Kp (q_des - q) = g_true(q) - g_model(q), by the
    fixed-point iteration of lab 21 (README step 5)."""
    # TODO: README step 5
    raise NotImplementedError("model-error offset")
