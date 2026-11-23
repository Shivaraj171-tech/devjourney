"""The list of labs, their XP and the badge rules. Plain data, no side effects."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent


@dataclass(frozen=True)
class Lab:
    key: str          # "lab01"
    folder: str       # "lab01_rotations"
    module: int
    title: str
    xp: int
    needs_mujoco: bool = False  # True: some tests are skipped without MuJoCo

    @property
    def path(self) -> Path:
        return ROOT / self.folder


LABS = [
    Lab("lab01", "lab01_rotations", 1, "Rotation matrices and SO(3)", 100),
    Lab("lab02", "lab02_euler", 1, "Euler ZYX angles and gimbal lock", 100),
    Lab("lab03", "lab03_axis_angle", 1, "Axis-angle, Rodrigues, exp/log", 120),
    Lab("lab04", "lab04_quaternions", 1, "Quaternions and slerp", 120, needs_mujoco=True),
    Lab("lab05", "lab05_transforms", 1, "Homogeneous transforms and frame chains", 120),
    Lab("lab06", "lab06_dh_fk", 2, "DH forward kinematics (3-DOF + UR5)", 150),
    Lab("lab07", "lab07_poe", 2, "Product of exponentials; DH == PoE", 180),
    Lab("lab08", "lab08_sim_fk", 2, "Validate FK against MuJoCo", 180, needs_mujoco=True),
    Lab("lab09", "lab09_jacobian", 3, "Space, body and geometric Jacobians", 180, needs_mujoco=True),
    Lab("lab10", "lab10_singularities", 3, "Singularities and manipulability", 150),
    Lab("lab11", "lab11_resolved_rate", 3, "Resolved-rate control in the simulator", 200,
        needs_mujoco=True),
    Lab("lab12", "lab12_analytic_ik", 4, "Analytic IK of the 3-DOF arm", 150),
    Lab("lab13", "lab13_newton_ik", 4, "Numerical IK: Newton-Raphson on the twist", 180),
    Lab("lab14", "lab14_dls_ik", 4, "Damped least squares, limits, choosing", 200),
    Lab("lab15", "lab15_ur5_ik", 4, "UR5 IK: reach poses, verify in MuJoCo", 220,
        needs_mujoco=True),
    Lab("lab16", "lab16_time_scaling", 5, "Cubic, quintic and trapezoidal timing", 150),
    Lab("lab17", "lab17_trajectories", 5, "Joint vs Cartesian trajectories on the UR5", 220,
        needs_mujoco=True),
    Lab("lab18", "lab18_lagrange_2r", 6, "Lagrangian dynamics of the 2-link arm", 200,
        needs_mujoco=True),
    Lab("lab19", "lab19_newton_euler", 6, "Recursive Newton-Euler inverse dynamics", 220,
        needs_mujoco=True),
    Lab("lab20", "lab20_forward_dynamics", 6, "Forward dynamics: your own simulator", 250,
        needs_mujoco=True),
    Lab("lab21", "lab21_pd_control", 7, "Independent joint PD: steps, gains, droop", 150,
        needs_mujoco=True),
    Lab("lab22", "lab22_gravity_comp", 7, "PD + gravity compensation, Lyapunov", 180,
        needs_mujoco=True),
    Lab("lab23", "lab23_computed_torque", 7, "Computed-torque control, 20% wrong masses", 220,
        needs_mujoco=True),
    Lab("lab24", "lab24_task_space", 7, "Task-space control: J^T, OSC, orientation", 220,
        needs_mujoco=True),
    Lab("lab25", "lab25_impedance", 7, "Impedance control: push it, press a table", 220,
        needs_mujoco=True),
    Lab("lab26", "lab26_grasp_basics", 8, "Grasp basics: friction cones, two-finger pinch", 180,
        needs_mujoco=True),
]

MODULE_NAMES = {1: "Rigid-body motion", 2: "Forward kinematics", 3: "Velocity kinematics",
                4: "Inverse kinematics", 5: "Trajectories", 6: "Dynamics", 7: "Control",
                8: "Grasping"}

HINT_COSTS = [5, 10, 20]   # XP per hint stage
REVEAL_AFTER_FAILS = 3     # failed checks needed before --reveal works

BADGES = {
    "first-light": "First Light: passed your first lab",
    "first-try": "One Shot: passed a lab on the first check",
    "purist": "Purist: passed 3 labs without hints",
    "frame-wrangler": "Frame Wrangler: completed Module 1 (rigid-body motion)",
    "chain-forger": "Chain Forger: completed Module 2 (forward kinematics)",
    "jacobian-whisperer": "Jacobian Whisperer: completed Module 3 (velocity kinematics)",
    "sim-validated": "Sim Validated: lab08 passed with MuJoCo actually running",
    "straight-shooter": "Straight Shooter: lab11 passed in MuJoCo",
    "pose-hunter": "Pose Hunter: completed Module 4 (inverse kinematics)",
    "smooth-operator": "Smooth Operator: completed Module 5 (trajectories)",
    "equations-of-motion": "Equations of Motion: completed Module 6 (dynamics)",
    "torque-matched": "Torque Matched: lab19 passed with MuJoCo's mj_inverse agreeing",
    "digital-twin": "Digital Twin: lab20 passed, your simulator matches MuJoCo",
    "graduate": "Manipulator Graduate: all labs complete",
}

# Labs 01-11 total 1600 XP, labs 12-20 another 1790 (3390 in all).
RANKS = [(0, "Novice"), (300, "Apprentice"), (700, "Technician"), (1100, "Engineer"),
         (1500, "Researcher"), (2200, "Senior Researcher"), (3000, "Principal Investigator")]


def find_lab(name: str) -> Lab:
    """Accept 'lab01', '1', '01', 'lab01_rotations'."""
    n = name.strip().lower()
    for lab in LABS:
        if n in (lab.key, lab.folder):
            return lab
    digits = n.removeprefix("lab").split("_")[0]
    if digits.isdigit():
        for lab in LABS:
            if int(lab.key[3:]) == int(digits):
                return lab
    raise KeyError(f"unknown lab {name!r}; try one of: {', '.join(lab.key for lab in LABS)}")


def rank(xp: int) -> str:
    title = RANKS[0][1]
    for threshold, name in RANKS:
        if xp >= threshold:
            title = name
    return title
