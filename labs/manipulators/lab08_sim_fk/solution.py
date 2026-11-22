"""Lab 08 reference solution: build an MJCF model from a DH table and validate FK in MuJoCo."""

from __future__ import annotations

import numpy as np

from labs.manipulators.lab01_rotations.solution import rot_x, rot_z
from labs.manipulators.lab03_axis_angle.solution import log_so3
from labs.manipulators.lab04_quaternions.solution import matrix_to_quat
from labs.manipulators.lab05_transforms.solution import make_transform
from labs.manipulators.lab06_dh_fk.solution import fk_dh


def _fmt(x) -> str:
    return " ".join(f"{float(v):.17g}" for v in np.ravel(x))


def link_constant(a, alpha, d) -> np.ndarray:
    """The q-independent part of a DH link: Tz(d) Tx(a) Rx(alpha)."""
    return make_transform(np.eye(3), [0.0, 0.0, d]) @ make_transform(rot_x(alpha), [a, 0.0, 0.0])


def dh_to_mjcf(dh, name: str = "arm") -> str:
    """MJCF XML for a revolute arm described by a standard DH table.

    Body i carries joint ``j{i}`` (hinge about its local z). Placing body i at
    (previous link constant) @ Rz(offset_i) makes body i's frame equal DH frame i-1
    rotated by Rz(q_i + offset_i), exactly as in T_{i-1,i}. Site ``ee`` = DH frame n.
    """
    dh = np.asarray(dh, dtype=float)
    n = len(dh)
    lines = [f'<mujoco model="{name}">', '  <compiler angle="radian"/>', "  <worldbody>"]
    prev = np.eye(4)
    indent = "    "
    for i in range(n):
        a, alpha, d, offset = dh[i]
        T_body = prev @ make_transform(rot_z(offset), [0, 0, 0])
        lines.append(f'{indent}<body name="link{i + 1}" pos="{_fmt(T_body[:3, 3])}" '
                     f'quat="{_fmt(matrix_to_quat(T_body[:3, :3]))}">')
        inner = indent + "  "
        lines.append(f'{inner}<joint name="j{i + 1}" type="hinge" axis="0 0 1" damping="1"/>')
        lines.append(f'{inner}<geom type="sphere" size="0.045" mass="1"/>')
        prev = link_constant(a, alpha, d)
        tip = prev[:3, 3]
        if np.linalg.norm(tip) > 1e-6:
            lines.append(f'{inner}<geom type="capsule" fromto="0 0 0 {_fmt(tip)}" size="0.03" '
                         f'mass="0.5"/>')
        indent = inner
    lines.append(f'{indent}<site name="ee" pos="{_fmt(prev[:3, 3])}" '
                 f'quat="{_fmt(matrix_to_quat(prev[:3, :3]))}" size="0.02"/>')
    for i in range(n):
        indent = indent[:-2]
        lines.append(f"{indent}</body>")
    lines += ["  </worldbody>", "</mujoco>"]
    return "\n".join(lines)


def load_model(xml: str):
    import mujoco
    model = mujoco.MjModel.from_xml_string(xml)
    return model, mujoco.MjData(model)


def sim_site_pose(model, data, q, site: str = "ee") -> np.ndarray:
    """Set the joint positions, run kinematics only (no dynamics, no rendering), read the site."""
    import mujoco
    data.qpos[:] = q
    mujoco.mj_kinematics(model, data)
    s = data.site(site)
    return make_transform(s.xmat.reshape(3, 3), s.xpos)


def pose_error(T_a, T_b):
    """(position error in metres, rotation error in radians) between two poses."""
    T_a, T_b = np.asarray(T_a), np.asarray(T_b)
    dp = float(np.linalg.norm(T_a[:3, 3] - T_b[:3, 3]))
    dr = float(np.linalg.norm(log_so3(T_a[:3, :3].T @ T_b[:3, :3])))
    return dp, dr


def compare_with_sim(dh, n_samples: int = 50, seed: int = 0):
    """Max (position, rotation) error between your fk_dh and MuJoCo at random configurations."""
    model, data = load_model(dh_to_mjcf(dh))
    rng = np.random.default_rng(seed)
    worst_p = worst_r = 0.0
    for _ in range(n_samples):
        q = rng.uniform(-np.pi, np.pi, size=len(dh))
        dp, dr = pose_error(sim_site_pose(model, data, q), fk_dh(dh, q))
        worst_p, worst_r = max(worst_p, dp), max(worst_r, dr)
    return worst_p, worst_r
