"""Lab 26 reference solution: contacts, Coulomb friction cones, the wrench on the object, and when a
two-finger pinch holds a box against gravity (checked in MuJoCo)."""

from __future__ import annotations

import numpy as np

GRAVITY = 9.81


def contact_frame(n) -> np.ndarray:
    """3x3 matrix with columns (t1, t2, n): two unit tangents and the unit normal, right-handed."""
    n = np.asarray(n, dtype=float)
    n = n / np.linalg.norm(n)
    helper = np.array([1.0, 0.0, 0.0]) if abs(n[0]) < 0.9 else np.array([0.0, 1.0, 0.0])
    t1 = np.cross(helper, n)
    t1 /= np.linalg.norm(t1)
    return np.column_stack([t1, np.cross(n, t1), n])


def in_friction_cone(f, n, mu: float, tol: float = 1e-9) -> bool:
    """Coulomb: the contact pushes (f.n >= 0) and |f_tangential| <= mu f.n."""
    f, n = np.asarray(f, dtype=float), np.asarray(n, dtype=float) / np.linalg.norm(n)
    fn = f @ n
    return bool(fn >= -tol and np.linalg.norm(f - fn * n) <= mu * fn + tol)


def friction_cone_edges(n, mu: float, k: int = 8) -> np.ndarray:
    """(k, 3): unit-normal-force vectors on the cone's surface, n + mu (cos a t1 + sin a t2),
    a = 2 pi j / k. Their positive combinations form the inscribed polyhedral cone."""
    t1, t2, nn = contact_frame(n).T
    a = 2 * np.pi * np.arange(k) / k
    return nn + mu * (np.cos(a)[:, None] * t1 + np.sin(a)[:, None] * t2)


def contact_wrench(p, f) -> np.ndarray:
    """Wrench (m, f) about the object's origin of a force f applied at p: (p x f, f)."""
    p, f = np.asarray(p, dtype=float), np.asarray(f, dtype=float)
    return np.concatenate([np.cross(p, f), f])


def grasp_matrix(points) -> np.ndarray:
    """6 x 3k G with w = G [f_1; ...; f_k] for point contacts with friction (forces in world axes):
    block i = [[p_i]x; I]."""
    blocks = []
    for p in np.atleast_2d(np.asarray(points, dtype=float)):
        px = np.array([[0, -p[2], p[1]], [p[2], 0, -p[0]], [-p[1], p[0], 0]])
        blocks.append(np.vstack([px, np.eye(3)]))
    return np.hstack(blocks)


def gravity_wrench(mass: float, com=(0.0, 0.0, 0.0), g: float = GRAVITY) -> np.ndarray:
    """The weight as a wrench (m, f) about the object origin: force (0, 0, -m g) at the COM."""
    return contact_wrench(com, [0.0, 0.0, -mass * g])


def min_friction_two_finger(mass: float, squeeze: float, g: float = GRAVITY) -> float:
    """Two fingers pressing opposite vertical faces with normal force N each: friction must carry
    the weight, 2 mu N >= m g, so mu_min = m g / (2 N)."""
    return mass * g / (2.0 * squeeze)


def two_finger_forces(mass: float, squeeze: float, g: float = GRAVITY) -> np.ndarray:
    """(2, 3) forces on the box from fingers on its -x face (pushing +x) and +x face (pushing -x),
    each carrying half the weight: (+-N, 0, m g / 2)."""
    return np.array([[squeeze, 0.0, mass * g / 2], [-squeeze, 0.0, mass * g / 2]])


def box_contact_forces(model, data, body: str):
    """[(point, force)] for every contact touching `body`: the world-frame force ON that body.

    mj_contactForce gives the force in the contact frame (rows of contact.frame: normal first,
    then two tangents) as the force on geom2 (the normal points from geom1 to geom2). Rotate to
    world with frame.T @ f[:3], and flip the sign if the body owns geom1."""
    import mujoco
    bid = model.body(body).id
    out, f = [], np.zeros(6)
    for i in range(data.ncon):
        c = data.contact[i]
        b1, b2 = model.geom_bodyid[c.geom1], model.geom_bodyid[c.geom2]
        if bid not in (b1, b2):
            continue
        mujoco.mj_contactForce(model, data, i, f)
        world = c.frame.reshape(3, 3).T @ f[:3]
        out.append((c.pos.copy(), world if b2 == bid else -world))
    return out


def pinch_experiment(mu: float, squeeze: float, box_mass: float, settle: float = 0.1,
                     hold: float = 1.0):
    """Squeeze the box in toolbox.models.pinch_mjcf with `squeeze` N per finger. After `settle`
    seconds record its height, run `hold` more seconds. Returns (drop [m] during the hold,
    contacts = box_contact_forces at the end)."""
    import mujoco

    from labs.manipulators.toolbox.models import pinch_mjcf
    model = mujoco.MjModel.from_xml_string(pinch_mjcf(mu, box_mass))
    data = mujoco.MjData(model)
    data.ctrl[:] = squeeze
    bid = model.body("box").id
    dt = model.opt.timestep
    for _ in range(int(round(settle / dt))):
        mujoco.mj_step(model, data)
    z0 = data.xpos[bid][2]
    for _ in range(int(round(hold / dt))):
        mujoco.mj_step(model, data)
    return float(z0 - data.xpos[bid][2]), box_contact_forces(model, data, "box")
