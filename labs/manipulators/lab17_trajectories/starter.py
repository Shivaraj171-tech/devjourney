"""Lab 17: joint-space vs task-space (Cartesian) trajectories on the UR5e.

Toolbox: quintic_scaling, trapezoid_profile, trapezoid_sample (lab 16), ik_lm (lab 14),
matrix_to_quat / quat_slerp / quat_to_matrix (lab 04), make_transform, fk_dh.
The sim interface (toolbox/sim.py): sim.q, sim.ee_pose(), sim.step(qdot, dt).
"""

from __future__ import annotations

import numpy as np

from labs.manipulators.toolbox import (  # noqa: F401
    body_screws, fk_dh, ik_lm, make_transform, matrix_to_quat, quat_slerp, quat_to_matrix,
    quintic_scaling, screws_from_dh, trapezoid_profile, trapezoid_sample,
)
from labs.manipulators.toolbox.robots import UR5E_DH

M_UR5E, S_UR5E = screws_from_dh(UR5E_DH)
B_UR5E = body_screws(M_UR5E, S_UR5E)


def joint_trajectory(q0, q1, T, ts):
    """(Q, Qd, Qdd), each (len(ts), n): q0 + s (q1 - q0) with quintic s(t) over duration T."""
    # TODO: README step 1
    raise NotImplementedError("joint-space trajectory")


def sync_trapezoid(q0, q1, vmax, amax):
    """(T, t_a, vs, as) of the shared trapezoid on s in [0, 1] (README step 2).
    Ignore joints with |q1 - q0| <= 1e-12."""
    # TODO
    raise NotImplementedError("synchronised trapezoid")


def trapezoid_joint_trajectory(q0, q1, vmax, amax, ts):
    """(Q, Qd, Qdd) along the joint-space line timed by the synchronised trapezoid."""
    # TODO: trapezoid_sample(t, 1.0, vs, as) gives (s, s', s'')
    raise NotImplementedError("trapezoid joint trajectory")


def cartesian_poses(T0, T1, s_values) -> np.ndarray:
    """(N, 4, 4): straight-line position, slerp orientation (README step 3)."""
    # TODO
    raise NotImplementedError("Cartesian interpolation")


def cartesian_trajectory(T0, T1, T, ts, q_start):
    """(Q (N, 6), ok): quintic s(t), poses from cartesian_poses, joints by
    ik_lm(M_UR5E, B_UR5E, T_d, q_prev) warm-started from the previous answer (q_start first).
    ok = every IK solve succeeded. np.unwrap(Q, axis=0) before returning."""
    # TODO: README step 4
    raise NotImplementedError("Cartesian trajectory via IK")


def finite_differences(Q, dt):
    """(Qd, Qdd, Qddd) by repeated np.gradient(..., dt, axis=0)."""
    # TODO: README step 5
    raise NotImplementedError("numerical derivatives")


def limit_check(Qd, Qdd, vmax, amax) -> dict:
    """{"vel_ratio": max |Qd| / vmax, "acc_ratio": max |Qdd| / amax, "ok": both <= 1}."""
    # TODO
    raise NotImplementedError("limit check")


def ee_positions(Q) -> np.ndarray:
    """(N, 3) gripper positions, fk_dh(UR5E_DH, q)[:3, 3] per row."""
    # TODO
    raise NotImplementedError("gripper path")


def track_in_mujoco(sim, Q, dt):
    """Stream Q to the sim: measure, then sim.step((Q[k+1] - Q[k]) / dt, dt), for every k.
    Return (P (N, 3) measured gripper positions, Qm (N, n) measured joints), sample 0 = before
    the first step."""
    # TODO: README step 6
    raise NotImplementedError("track in the simulator")
