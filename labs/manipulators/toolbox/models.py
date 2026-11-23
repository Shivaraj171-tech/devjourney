"""MuJoCo models with real inertial properties, for the dynamics labs (Module 6).

Not a lab solution: this is the test rig (like `sim.py`). It writes MJCF in which every body
has an explicit <inertial> element, so MuJoCo uses exactly the masses, centres of mass and
inertias in `robots.py`. Geoms are visual only (contype/conaffinity 0; with an explicit
<inertial> MuJoCo does not take mass from geoms). No joint damping, armature, friction, limits
or contacts, so MuJoCo's equations of motion are exactly

    M(q) qdd + C(q, qd) qd + g(q) = tau

the ones you derive. `<flag energy="enable"/>` makes MuJoCo fill data.energy = [potential, kinetic].

    dh_arm_mjcf(dh, links)   any revolute DH arm (same body/joint layout as lab 08's dh_to_mjcf)
    planar2r_mjcf(params)    the 2-link arm of lab 18 in the vertical x-z plane
"""

from __future__ import annotations

import numpy as np

from labs.manipulators.lab01_rotations.solution import rot_x, rot_z
from labs.manipulators.lab04_quaternions.solution import matrix_to_quat
from labs.manipulators.lab05_transforms.solution import make_transform


def _fmt(x) -> str:
    return " ".join(f"{float(v):.17g}" for v in np.ravel(x))


def _option(timestep: float, gravity: float, integrator: str, contact: bool = False) -> str:
    flag = 'energy="enable"' if contact else 'contact="disable" energy="enable"'
    return (f'  <option timestep="{timestep!r}" gravity="0 0 {-gravity!r}" integrator="{integrator}">\n'
            f'    <flag {flag}/>\n  </option>')


def dh_arm_mjcf(dh, links, name: str = "arm_dyn", gravity: float = 9.81,
                timestep: float = 0.001, integrator: str = "RK4") -> str:
    """MJCF for a revolute DH arm whose link i has the inertial row links[i] (see robots.py).

    Body i's frame is DH frame i-1 turned by Rz(q_i + offset_i) (lab 08). DH frame i is that
    frame times L_i = Tz(d) Tx(a) Rx(alpha), so a COM given in DH frame i sits at L_i @ com in
    body i, with principal axes rotated by Rx(alpha).
    """
    dh = np.asarray(dh, dtype=float)
    lines = [f'<mujoco model="{name}">', '  <compiler angle="radian"/>',
             _option(timestep, gravity, integrator), "  <worldbody>"]
    prev = np.eye(4)
    indent = "    "
    for i, ((a, alpha, d, offset), (mass, com, inertia)) in enumerate(zip(dh, links)):
        T_body = prev @ make_transform(rot_z(offset), [0, 0, 0])
        lines.append(f'{indent}<body name="link{i + 1}" pos="{_fmt(T_body[:3, 3])}" '
                     f'quat="{_fmt(matrix_to_quat(T_body[:3, :3]))}">')
        inner = indent + "  "
        lines.append(f'{inner}<joint name="j{i + 1}" type="hinge" axis="0 0 1"/>')
        L = make_transform(np.eye(3), [0, 0, d]) @ make_transform(rot_x(alpha), [a, 0, 0])
        com_body = L[:3, :3] @ np.asarray(com, dtype=float) + L[:3, 3]
        lines.append(f'{inner}<inertial pos="{_fmt(com_body)}" '
                     f'quat="{_fmt(matrix_to_quat(L[:3, :3]))}" mass="{float(mass)!r}" '
                     f'diaginertia="{_fmt(inertia)}"/>')
        tip = L[:3, 3]
        if np.linalg.norm(tip) > 1e-6:
            lines.append(f'{inner}<geom type="capsule" fromto="0 0 0 {_fmt(tip)}" size="0.03" '
                         'contype="0" conaffinity="0"/>')
        prev = L
        indent = inner
    lines.append(f'{indent}<site name="ee" pos="{_fmt(prev[:3, 3])}" '
                 f'quat="{_fmt(matrix_to_quat(prev[:3, :3]))}" size="0.02"/>')
    for _ in range(len(dh)):
        indent = indent[:-2]
        lines.append(f"{indent}</body>")
    lines += ["  </worldbody>", "</mujoco>"]
    return "\n".join(lines)


def planar2r_mjcf(p, timestep: float = 0.001, integrator: str = "RK4",
                  gravity: bool = True) -> str:
    """The lab 18 arm: links along +x, joints about -y (so +q turns x towards +z), gravity -z.

    The swing axis is the body y axis, so Iyy = I1 (I2). The two other principal moments only
    need to be valid (triangle inequality); they never enter planar motion.
    """
    def body(i, pos, length, m, lc, inertia, inner=""):
        return (f'<body name="link{i}" pos="{_fmt(pos)}">'
                f'<joint name="j{i}" type="hinge" axis="0 -1 0"/>'
                f'<inertial pos="{lc!r} 0 0" mass="{m!r}" '
                f'diaginertia="{inertia * 0.01!r} {inertia!r} {inertia!r}"/>'
                f'<geom type="capsule" fromto="0 0 0 {length!r} 0 0" size="0.02" contype="0" '
                f'conaffinity="0"/>{inner}</body>')

    ee = f'<site name="ee" pos="{p["l2"]!r} 0 0"/>'
    link2 = body(2, [p["l1"], 0, 0], p["l2"], p["m2"], p["lc2"], p["I2"], ee)
    link1 = body(1, [0, 0, 0], p["l1"], p["m1"], p["lc1"], p["I1"], link2)
    return "\n".join([
        '<mujoco model="planar2r">',
        _option(timestep, p["g"] if gravity else 0.0, integrator),
        "  <worldbody>", f"    {link1}", "  </worldbody>", "</mujoco>"])
