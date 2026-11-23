"""Lab 26: grasp basics: contacts, Coulomb friction cones, the wrench on the object, and when a
two-finger pinch holds a box against gravity.

Wrenches are (m, f): moment first, like the twists (omega, v). Forces are in world axes.
MuJoCo rig: toolbox.models.pinch_mjcf(mu, box_mass) (two force-driven fingers, a free box).
"""

from __future__ import annotations

import numpy as np

GRAVITY = 9.81


def contact_frame(n) -> np.ndarray:
    """3x3 with columns (t1, t2, n): unit tangents and the unit normal, right-handed (README step 1)."""
    # TODO: README step 1
    raise NotImplementedError("contact frame")


def in_friction_cone(f, n, mu: float, tol: float = 1e-9) -> bool:
    """f.n >= 0 and |f - (f.n) n| <= mu f.n, both up to tol (README step 2)."""
    # TODO: README step 2
    raise NotImplementedError("friction cone test")


def friction_cone_edges(n, mu: float, k: int = 8) -> np.ndarray:
    """(k, 3): n + mu (cos a_j t1 + sin a_j t2), a_j = 2 pi j / k (README step 2)."""
    # TODO: README step 2
    raise NotImplementedError("cone edges")


def contact_wrench(p, f) -> np.ndarray:
    """(p x f, f) (README step 3)."""
    # TODO: README step 3
    raise NotImplementedError("contact wrench")


def grasp_matrix(points) -> np.ndarray:
    """6 x 3k, block i = [[p_i]x; I3] (README step 3)."""
    # TODO: README step 3
    raise NotImplementedError("grasp matrix")


def gravity_wrench(mass: float, com=(0.0, 0.0, 0.0), g: float = GRAVITY) -> np.ndarray:
    """The weight (0, 0, -m g) at com, as a wrench (README step 3)."""
    # TODO: README step 3
    raise NotImplementedError("gravity wrench")


def min_friction_two_finger(mass: float, squeeze: float, g: float = GRAVITY) -> float:
    """mu_min for two opposing fingers, normal force `squeeze` each (README step 4)."""
    # TODO: README step 4
    raise NotImplementedError("friction threshold")


def two_finger_forces(mass: float, squeeze: float, g: float = GRAVITY) -> np.ndarray:
    """(2, 3): forces on the box from the finger on its -x face, then the one on its +x face (step 4)."""
    # TODO: README step 4
    raise NotImplementedError("two-finger forces")


def box_contact_forces(model, data, body: str):
    """[(point, world force ON body)] for each contact touching `body` (README step 5).
    Import mujoco inside."""
    # TODO: README step 5
    raise NotImplementedError("contact forces from MuJoCo")


def pinch_experiment(mu: float, squeeze: float, box_mass: float, settle: float = 0.1,
                     hold: float = 1.0):
    """(drop [m] of the box's height during `hold` after `settle`, box_contact_forces at the end),
    in pinch_mjcf(mu, box_mass) with data.ctrl[:] = squeeze (README step 6)."""
    # TODO: README step 6
    raise NotImplementedError("pinch experiment")
