"""Lab 25: impedance control: make the hand a spring-damper, push it, measure it, press it on a table.

Toolbox: fk_space, geometric_jacobian (labs 07, 09), make_gravity_fn (lab 22),
run_mujoco_control with its before_step hook (lab 21), toolbox.models.arm3_table_mjcf.
"""

from __future__ import annotations

import numpy as np


def as_matrix(K, n: int) -> np.ndarray:
    """Scalar -> K * I, 1-D vector -> diag(K), n x n matrix -> unchanged (README step 1)."""
    # TODO
    raise NotImplementedError("gain as a matrix")


def impedance_torque(J, qd, x, x0, K, D, g) -> np.ndarray:
    """tau = J^T (K (x0 - x) - D J qd) + g with K, D through as_matrix (README step 1)."""
    # TODO: README step 1
    raise NotImplementedError("impedance torque")


def predicted_deflection(K, f) -> np.ndarray:
    """x - x0 at rest when an external force f pushes the hand (README step 2)."""
    # TODO: README step 2
    raise NotImplementedError("deflection")


def xfrc_for_point_force(force, point, com) -> np.ndarray:
    """The 6-vector for data.xfrc_applied[body] that applies `force` at `point` (README step 3)."""
    # TODO: README step 3
    raise NotImplementedError("xfrc_applied row")


def estimate_stiffness(forces, displacements) -> np.ndarray:
    """3x3 K from rows f_k = K d_k by least squares (README step 4)."""
    # TODO: README step 4
    raise NotImplementedError("stiffness estimate")


def contact_normal_force(model, data, geom_a: str, geom_b: str) -> float:
    """Sum of normal forces [N] over the contacts between two named geoms (README step 5).
    Import mujoco inside."""
    # TODO: README step 5
    raise NotImplementedError("contact normal force")
