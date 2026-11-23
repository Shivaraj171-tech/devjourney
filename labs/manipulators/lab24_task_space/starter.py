"""Lab 24: task-space control: Jacobian transpose and operational space control to a Cartesian
target, orientation error, and the null space.

Toolbox: log_so3 (lab 03); fk_space, geometric_jacobian [Jv; Jw] (labs 07, 09);
make_gravity_fn (lab 22); toolbox.sim.MujocoDynamics (fast M and g from MuJoCo, see README).
"""

from __future__ import annotations

import numpy as np

from labs.manipulators.toolbox import log_so3  # noqa: F401


def planar2r_fk(q, p) -> np.ndarray:
    """(x, z) of the 2R tip: l1 (c1, s1) + l2 (c12, s12) (README step 1)."""
    # TODO: README step 1
    raise NotImplementedError("2R tip position")


def planar2r_jacobian(q, p) -> np.ndarray:
    """2x2 Jacobian of planar2r_fk."""
    # TODO: README step 1
    raise NotImplementedError("2R Jacobian")


def orientation_error(R, R_d) -> np.ndarray:
    """World-frame rotation vector from R to R_d: log(R_d R^T) (README step 4)."""
    # TODO: README step 4
    raise NotImplementedError("orientation error")


def pose_error(T, T_d) -> np.ndarray:
    """[p_d - p; orientation_error(R, R_d)] (6,), ordered like [Jv; Jw] (README step 4)."""
    # TODO: README step 4
    raise NotImplementedError("pose error")


def jacobian_transpose_control(J, qd, e, Kp, Kd, g) -> np.ndarray:
    """tau = J^T (Kp e - Kd J qd) + g (README step 2)."""
    # TODO: README step 2
    raise NotImplementedError("Jacobian-transpose control")


def task_space_inertia(J, M) -> np.ndarray:
    """Lambda = (J M^-1 J^T)^-1 (README step 3). Use np.linalg.solve for M^-1 J^T."""
    # TODO: README step 3
    raise NotImplementedError("task-space inertia")


def operational_space_control(J, M, qd, e, Kp, Kd, g) -> np.ndarray:
    """tau = J^T Lambda (Kp e - Kd J qd) + g (README step 3)."""
    # TODO: README step 3
    raise NotImplementedError("operational space control")


def nullspace_projector(J, M) -> np.ndarray:
    """N = I - J^T Jbar^T, Jbar = M^-1 J^T Lambda (README step 5)."""
    # TODO: README step 5
    raise NotImplementedError("null-space projector")
