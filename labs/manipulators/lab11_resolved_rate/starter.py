"""Lab 11: resolved-rate control: drive the gripper along a straight line, in MuJoCo.

The robot is a `sim` object (labs/manipulators/toolbox/sim.py) with:
    sim.q, sim.ee_pose() -> 4x4, sim.jacobian() -> 6 x n [Jv; Jw], sim.step(qdot, dt)
The same controller runs on a perfect numpy robot and on a MuJoCo multibody.
"""

from __future__ import annotations

import numpy as np

from labs.manipulators.toolbox import log_so3  # noqa: F401


def quintic_time_scaling(t: float, T: float):
    """(s, ds/dt) for s(tau) = 10 tau^3 - 15 tau^4 + 6 tau^5, tau = t/T clipped to [0, 1].
    Outside [0, T], ds/dt = 0."""
    # TODO
    raise NotImplementedError("quintic time scaling")


def straight_line_reference(p0, p1, t: float, T: float):
    """(p_ref, v_ref) on the segment p0 -> p1 at time t."""
    # TODO: p = p0 + s (p1 - p0), v = sdot (p1 - p0)
    raise NotImplementedError("straight-line reference")


def dls_inverse(J, damping: float) -> np.ndarray:
    """Damped least squares: J^T (J J^T + damping^2 I)^-1 (use np.linalg.solve, not inv)."""
    # TODO
    raise NotImplementedError("damped least-squares inverse")


def pose_error(T_des, T) -> np.ndarray:
    """[p_des - p ; log(R_des R^T)] (6,), both parts in world axes."""
    # TODO
    raise NotImplementedError("pose error")


def resolved_rate_qdot(J, v_ff, err, gain: float, damping: float) -> np.ndarray:
    """qdot = dls_inverse(J) @ (v_ff + gain * err)."""
    # TODO
    raise NotImplementedError("resolved-rate law")


def run_straight_line(sim, p_goal, duration: float = 2.0, dt: float = 0.01,
                      gain: float = 20.0, damping: float = 0.01, settle: float = 0.5):
    """Move from the current gripper position to p_goal on a straight line, keeping the
    starting orientation, then hold for `settle` seconds.

    Return a dict with numpy arrays:
      "t" (N,), "p" (N, 3) measured positions, "q" (N, n), "rot_err" (N,) angle [rad]
      between the start orientation and the measured one, and "p0", "p1" (3,).
    Log the measurement at every step k = 0 ... steps (inclusive), where
    steps = round((duration + settle) / dt); command sim.step after each log except the last.
    """
    # TODO: README step 5 is the whole loop in pseudo-code.
    raise NotImplementedError("the control loop")


def path_deviation(points, p0, p1) -> np.ndarray:
    """Distance from each point (N, 3) to the SEGMENT p0-p1 (clip the projection to [0, 1])."""
    # TODO
    raise NotImplementedError("distance to a segment")
