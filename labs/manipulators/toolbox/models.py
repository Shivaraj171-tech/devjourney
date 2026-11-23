"""MuJoCo models with real inertial properties, for the dynamics labs (Module 6).

Not a lab solution: this is the test rig (like `sim.py`). It writes MJCF in which every body
has an explicit <inertial> element, so MuJoCo uses exactly the masses, centres of mass and
inertias in `robots.py` (`diaginertia` for principal moments, `fullinertia` for a 3x3 tensor). Geoms are visual only (contype/conaffinity 0; with an explicit
<inertial> MuJoCo does not take mass from geoms). No joint damping, armature, friction, limits
or contacts, so MuJoCo's equations of motion are exactly

    M(q) qdd + C(q, qd) qd + g(q) = tau

the ones you derive. `<flag energy="enable"/>` makes MuJoCo fill data.energy = [potential, kinetic].

    dh_arm_mjcf(dh, links)   any revolute DH arm (same body/joint layout as lab 08's dh_to_mjcf)
    planar2r_mjcf(params)    the 2-link arm of lab 18 in the vertical x-z plane

Module 7-8 additions (control and grasping):

    with_motors(xml, n)      append a torque motor per joint: data.ctrl[i] = tau_i [N m]
    pendulum_mjcf(...)       one link of the 2R arm on its own (a 1-DOF joint for lab 21)
    arm3_table_mjcf(...)     the 3-DOF arm with a ball fingertip above a table (lab 25)
    pinch_mjcf(...)          two force-driven fingers squeezing a free box (lab 26)
    ur5e_gripper_mjcf(...)   the UR5e with a two-finger gripper, a table and a box (lab 28)

Contact scenes keep the arm links collision-free (contype/conaffinity 0): only fingertips,
finger pads, boxes and the table collide. Contact geoms in a body that has an explicit
<inertial> add no mass, so the arm's dynamics stay exactly those of `robots.py`.
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
                timestep: float = 0.001, integrator: str = "RK4", contact: bool = False) -> str:
    """MJCF for a revolute DH arm whose link i has the inertial row links[i] (see robots.py).

    Body i's frame is DH frame i-1 turned by Rz(q_i + offset_i) (lab 08). DH frame i is that
    frame times L_i = Tz(d) Tx(a) Rx(alpha), so a COM given in DH frame i sits at L_i @ com in
    body i, with principal axes rotated by Rx(alpha).
    """
    dh = np.asarray(dh, dtype=float)
    lines = [f'<mujoco model="{name}">', '  <compiler angle="radian"/>',
             _option(timestep, gravity, integrator, contact), "  <worldbody>"]
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
        I = np.asarray(inertia, dtype=float)
        if I.ndim == 1:   # principal moments, axes parallel to DH frame i
            lines.append(f'{inner}<inertial pos="{_fmt(com_body)}" '
                         f'quat="{_fmt(matrix_to_quat(L[:3, :3]))}" mass="{float(mass)!r}" '
                         f'diaginertia="{_fmt(I)}"/>')
        else:             # full tensor in DH frame i axes: rotate it into the body frame
            Ib = L[:3, :3] @ I @ L[:3, :3].T
            full = [Ib[0, 0], Ib[1, 1], Ib[2, 2], Ib[0, 1], Ib[0, 2], Ib[1, 2]]
            lines.append(f'{inner}<inertial pos="{_fmt(com_body)}" mass="{float(mass)!r}" '
                         f'fullinertia="{_fmt(full)}"/>')
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


# ---------------------------------------------------------------- Modules 7-8: control, grasping

def with_motors(xml: str, n: int, gear: float = 1.0) -> str:
    """Append one <motor> per joint j1..jn. A motor applies gear * ctrl as a generalized force on
    its joint, with no internal dynamics or servo: data.ctrl[i] is the torque on joint i."""
    motors = "\n".join(f'    <motor name="m{i + 1}" joint="j{i + 1}" gear="{gear!r}"/>'
                       for i in range(n))
    return xml.replace("</mujoco>", f"  <actuator>\n{motors}\n  </actuator>\n</mujoco>")


def pendulum_mjcf(mass: float, lc: float, inertia: float, gravity: float = 0.0,
                  timestep: float = 0.001, integrator: str = "RK4") -> str:
    """A single link (joint j1 about -y, like the 2R arm), with a torque motor. Inertia about the
    joint: inertia + mass lc^2. With gravity 0 it is exactly J qdd = tau."""
    return with_motors("\n".join([
        '<mujoco model="pendulum">', _option(timestep, gravity, integrator),
        "  <worldbody>",
        '    <body name="link1"><joint name="j1" type="hinge" axis="0 -1 0"/>'
        f'<inertial pos="{lc!r} 0 0" mass="{mass!r}" '
        f'diaginertia="{inertia * 0.01!r} {inertia!r} {inertia!r}"/>'
        f'<geom type="capsule" fromto="0 0 0 {2 * lc!r} 0 0" size="0.02" contype="0" '
        'conaffinity="0"/></body>',
        "  </worldbody>", "</mujoco>"]), 1)


def arm3_table_mjcf(dh, links, table_z: float, tip_radius: float = 0.02,
                    timestep: float = 0.001) -> str:
    """The DH arm with motors, contacts on, a ball fingertip (geom "tip", radius tip_radius,
    centred on the ee site) and a table (geom "table", top surface at z = table_z).
    The ball adds no mass (the link has an explicit <inertial>)."""
    xml = dh_arm_mjcf(dh, links, timestep=timestep, integrator="implicitfast", contact=True)
    site = xml[xml.index('<site name="ee"'):]
    site = site[:site.index("/>") + 2]
    pos = site.split('pos="')[1].split('"')[0]
    tip = (f'<geom name="tip" type="sphere" pos="{pos}" size="{tip_radius!r}" '
           'contype="1" conaffinity="1" condim="3" friction="0.5 0.005 0.0001"/>')
    xml = xml.replace(site, site + "\n" + tip)
    table = (f'    <geom name="table" type="box" pos="0.5 0 {table_z - 0.05!r}" '
             'size="0.4 0.4 0.05" contype="1" conaffinity="1" condim="3" friction="0.5 0.005 0.0001"/>')
    xml = xml.replace("  <worldbody>", "  <worldbody>\n" + table, 1)
    return with_motors(xml, len(dh))


def pinch_mjcf(mu: float, box_mass: float = 0.2, half: float = 0.02, finger_mass: float = 0.1,
               condim: int = 3, timestep: float = 0.001, impratio: float = 10.0) -> str:
    """Two fingers squeeze a free cube between them; nothing else touches it.

    Finger "left" slides along +x (joint jl), "right" along -x (joint jr); each has a motor, so
    data.ctrl = [N_left, N_right] are the squeeze forces [N] (positive closes). Pads: geoms
    "pad_l" and "pad_r" with friction mu. The cube's geom has friction 0; MuJoCo combines two
    geoms' friction by taking the element-wise max, so mu is the contact's friction. The cube
    (body and geom "box") starts centred at (0, 0, 0.3) with the pads just touching its faces.
    Elliptic friction cones: the friction limit is Coulomb's |f_t| <= mu f_n, not a pyramid.

    MuJoCo's contacts are soft, so even a grasp inside the cone creeps slowly (2.6 mm/s here
    with default settings, measured). impratio (frictional-to-normal impedance ratio) makes
    friction stiffer: 10 cut the creep to 0.26 mm/s without moving the slip threshold.
    """
    pad = 0.005
    mu, box_mass, half, finger_mass = float(mu), float(box_mass), float(half), float(finger_mass)

    def finger(name, sign, joint):
        x = sign * (half + pad)
        return (f'    <body name="{name}" pos="{x!r} 0 0.3">'
                f'<joint name="{joint}" type="slide" axis="{-sign} 0 0" damping="2"/>'
                f'<inertial pos="0 0 0" mass="{finger_mass!r}" diaginertia="1e-5 1e-5 1e-5"/>'
                f'<geom name="pad_{name[0]}" type="box" size="{pad} 0.015 0.015" '
                f'friction="{mu!r} 0.005 0.0001" condim="{condim}"/></body>')

    return "\n".join([
        '<mujoco model="pinch">',
        f'  <option timestep="{timestep!r}" gravity="0 0 -9.81" integrator="implicitfast" '
        f'cone="elliptic" impratio="{impratio!r}"/>',
        "  <worldbody>",
        finger("left", -1, "jl"), finger("right", 1, "jr"),
        '    <body name="box" pos="0 0 0.3"><freejoint name="box"/>'
        f'<geom name="box" type="box" size="{half!r} {half!r} {half!r}" mass="{box_mass!r}" '
        f'friction="0 0 0" condim="{condim}"/></body>',
        "  </worldbody>",
        '  <actuator><motor name="ml" joint="jl"/><motor name="mr" joint="jr"/></actuator>',
        "</mujoco>"])


# The lab 28 gripper, in the UR5e flange frame (DH frame 6: z = approach direction).
GRIPPER_TCP = 0.10        # tool centre point: z offset from the flange to the middle of the pads
GRIPPER_OPEN_GAP = 0.046  # half the distance between the pad faces when fully open [m]
GRIPPER_STROKE = 0.04     # finger travel [m]
BOX_HALF = 0.02           # the lab 28 cube's half size [m]


def ur5e_gripper_mjcf(dh, links, box_pos, box_yaw: float = 0.0, box_mass: float = 0.1,
                     mu: float = 1.0, timestep: float = 0.001) -> str:
    """The UR5e (dh, links) on a table (plane "table" at z = 0), a two-finger gripper on its flange
    and a free cube (body/geom "box", half size BOX_HALF) resting at box_pos (x, y), yaw box_yaw.

    Gripper: body "hand" on the flange (0.4 kg), fingers "finger_l"/"finger_r" on slide joints
    "jl"/"jr" along -/+ flange y (positive = closing, range [0, GRIPPER_STROKE], damping 5),
    pads "pad_l"/"pad_r" centred at z = GRIPPER_TCP (site "tcp"). Actuators: motors m1..m6 on the
    arm joints (ctrl[0:6] = torques [N m]) and "ml"/"mr" on the fingers (ctrl[6:8] = finger
    forces [N], positive closes). qpos layout: 6 arm joints, jl, jr, then the box's free joint
    (x, y, z, quaternion w x y z).
    Contacts: only pads, box and table collide (condim 4: torsional friction too, see lab 27).
    The box geom has friction 0: MuJoCo uses the larger of two geoms' coefficients, so pad-box
    contacts get the pads' mu and box-table contacts the table's 0.8. Elliptic cones and
    impratio 10, as in pinch_mjcf.
    """
    mu, box_mass = float(mu), float(box_mass)
    xml = dh_arm_mjcf(dh, links, name="ur5e_gripper", timestep=timestep,
                      integrator="implicitfast", contact=True)
    site = xml[xml.index('<site name="ee"'):]
    site = site[:site.index("/>") + 2]
    pos = site.split('pos="')[1].split('"')[0]
    quat = site.split('quat="')[1].split('"')[0]
    t = GRIPPER_TCP
    pad_y = GRIPPER_OPEN_GAP + 0.004

    def finger(name, side, joint):
        return (f'<body name="{name}" pos="0 {side * pad_y!r} {t!r}">'
                f'<joint name="{joint}" type="slide" axis="0 {-side} 0" range="0 {GRIPPER_STROKE!r}" '
                'limited="true" damping="5"/>'
                '<inertial pos="0 0 0" mass="0.05" diaginertia="2e-5 2e-5 2e-5"/>'
                f'<geom name="pad_{name[-1]}" type="box" size="0.012 0.004 0.015" '
                f'friction="{mu!r} 0.01 0.0001" condim="4"/>'
                f'<geom type="box" pos="0 0 -0.04" size="0.008 0.004 0.03" contype="0" '
                'conaffinity="0"/></body>')

    hand = (f'<body name="hand" pos="{pos}" quat="{quat}">'
            '<inertial pos="0 0 0.03" mass="0.4" diaginertia="5e-4 5e-4 5e-4"/>'
            '<geom type="box" pos="0 0 0.02" size="0.02 0.06 0.02" contype="0" conaffinity="0"/>'
            f'<site name="tcp" pos="0 0 {t!r}" size="0.005"/>'
            + finger("finger_l", 1, "jl") + finger("finger_r", -1, "jr") + "</body>")
    xml = xml.replace(site, site + "\n" + hand)
    c, s = float(np.cos(box_yaw / 2)), float(np.sin(box_yaw / 2))
    world = ('    <geom name="table" type="plane" size="1.5 1.5 0.1" friction="0.8 0.005 0.0001" '
             'condim="3"/>\n'
             f'    <body name="box" pos="{float(box_pos[0])!r} {float(box_pos[1])!r} {BOX_HALF!r}" '
             f'quat="{c!r} 0 0 {s!r}"><freejoint name="box"/>'
             f'<geom name="box" type="box" size="{BOX_HALF!r} {BOX_HALF!r} {BOX_HALF!r}" '
             f'mass="{box_mass!r}" friction="0 0 0" condim="4"/></body>')
    xml = xml.replace("  </worldbody>", world + "\n  </worldbody>", 1)
    xml = xml.replace('integrator="implicitfast"', 'integrator="implicitfast" cone="elliptic" '
                      'impratio="10"', 1)
    xml = with_motors(xml, len(dh))
    return xml.replace("  </actuator>", '    <motor name="ml" joint="jl"/>\n'
                       '    <motor name="mr" joint="jr"/>\n  </actuator>')
