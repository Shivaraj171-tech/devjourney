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
]

MODULE_NAMES = {1: "Rigid-body motion", 2: "Forward kinematics", 3: "Velocity kinematics"}

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
    "graduate": "Manipulator Graduate: all labs complete",
}

RANKS = [(0, "Novice"), (300, "Apprentice"), (700, "Technician"), (1100, "Engineer"),
         (1500, "Researcher")]


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
