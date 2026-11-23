"""Lab 15 reference solution: a UR5 IK campaign, verified with FK and in MuJoCo."""

from __future__ import annotations

import numpy as np

from labs.manipulators.lab02_euler.solution import euler_zyx_to_matrix
from labs.manipulators.lab05_transforms.solution import make_transform
from labs.manipulators.lab06_dh_fk.solution import fk_dh
from labs.manipulators.lab07_poe.solution import body_screws, screws_from_dh
from labs.manipulators.lab08_sim_fk.solution import pose_error
from labs.manipulators.lab14_dls_ik.solution import multi_start_ik, select_solution
from labs.manipulators.toolbox.robots import UR5_DH, UR5_Q_MAX, UR5_Q_MIN

M_UR5, S_UR5 = screws_from_dh(UR5_DH)
B_UR5 = body_screws(M_UR5, S_UR5)


def make_pose(p, rpy) -> np.ndarray:
    """4x4 pose from a position and ZYX Euler angles (yaw, pitch, roll): R = Rz Ry Rx (lab 02)."""
    return make_transform(euler_zyx_to_matrix(*rpy), p)


def ik_seeds(q_seed, n_random: int = 16, rng_seed: int = 0) -> np.ndarray:
    """[q_seed] followed by n_random seeds uniform within the joint limits (fixed RNG seed)."""
    rng = np.random.default_rng(rng_seed)
    rand = rng.uniform(UR5_Q_MIN, UR5_Q_MAX, size=(n_random, 6))
    return np.vstack([np.asarray(q_seed, dtype=float)[None], rand])


def solve_ur5_pose(T_d, q_seed, n_random: int = 16):
    """All distinct solutions found from ik_seeds, then the one closest to q_seed within limits.

    Returns (q or None, candidates list).
    """
    cands = multi_start_ik(M_UR5, B_UR5, T_d, ik_seeds(q_seed, n_random), UR5_Q_MIN, UR5_Q_MAX)
    return select_solution(cands, q_seed, UR5_Q_MIN, UR5_Q_MAX), cands


def ik_campaign(poses: dict, q_start, n_random: int = 16) -> list:
    """Solve each named pose in order, seeding each with the previous solution (or q_start).

    Each row: {"name", "success", "q", "n_solutions", "pos_err" [m], "rot_err" [rad]} with the
    errors from an INDEPENDENT forward kinematics (DH, lab 06), not the PoE model IK used.
    Failed rows have q None and errors nan.
    """
    rows = []
    q_prev = np.asarray(q_start, dtype=float)
    for name, T_d in poses.items():
        q, cands = solve_ur5_pose(T_d, q_prev, n_random)
        row = {"name": name, "success": q is not None, "q": q, "n_solutions": len(cands),
               "pos_err": float("nan"), "rot_err": float("nan")}
        if q is not None:
            row["pos_err"], row["rot_err"] = pose_error(fk_dh(UR5_DH, q), T_d)
            q_prev = q
        rows.append(row)
    return rows


def mujoco_kinematic_errors(rows, poses: dict) -> list:
    """For each successful row: (pos_err, rot_err) between MuJoCo's ee site at q and the target.
    Failed rows give (nan, nan)."""
    from labs.manipulators.lab08_sim_fk.solution import dh_to_mjcf, load_model, sim_site_pose

    model, data = load_model(dh_to_mjcf(UR5_DH))
    out = []
    for row in rows:
        if not row["success"]:
            out.append((float("nan"), float("nan")))
            continue
        out.append(pose_error(sim_site_pose(model, data, row["q"]), poses[row["name"]]))
    return out


def drive_mujoco(sim, q_goal, duration: float = 2.0, dt: float = 0.01, settle: float = 1.0):
    """Ramp the servo set-point linearly from sim.q to q_goal over `duration`, hold for `settle`.
    Returns the measured end-effector pose afterwards."""
    q0 = sim.q
    qdot = (np.asarray(q_goal, dtype=float) - q0) / duration
    for _ in range(int(round(duration / dt))):
        sim.step(qdot, dt)
    for _ in range(int(round(settle / dt))):
        sim.step(np.zeros_like(q0), dt)
    return sim.ee_pose()


def format_report(rows) -> str:
    """A fixed-width table: name, ok, #solutions, position error [mm], orientation error [deg]."""
    lines = [f"{'pose':<12}{'ok':<5}{'#sol':>5}{'pos [mm]':>12}{'rot [deg]':>12}"]
    for r in rows:
        lines.append(f"{r['name']:<12}{'yes' if r['success'] else 'NO':<5}{r['n_solutions']:>5}"
                     f"{r['pos_err'] * 1e3:>12.2e}{np.degrees(r['rot_err']):>12.2e}")
    return "\n".join(lines)
