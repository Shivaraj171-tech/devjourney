"""The reference toolbox: earlier labs' functions, so later labs build on solid ground.

SPOILER WARNING: this re-exports the reference solutions of earlier labs. Finish a
lab before you read the code behind its toolbox functions. Starters from lab 02 on
import from here so a bug in one lab can't cascade into the next.

Module 1 (labs 01-05): rotations, Euler, exp/log, quaternions, transforms.
Module 2 (labs 06-08): DH and PoE forward kinematics, MJCF generation.
Module 3 helpers (Jacobians, sims) live in `toolbox.sim` and lab solutions; import
them explicitly where needed.
"""

from labs.manipulators.lab01_rotations.solution import (  # noqa: F401
    is_rotation_matrix, project_to_so3, relative_rotation, rot_x, rot_y, rot_z, skew, vee,
)
from labs.manipulators.lab02_euler.solution import (  # noqa: F401
    euler_rate_matrix, euler_zyx_to_matrix, matrix_to_euler_zyx,
)
from labs.manipulators.lab03_axis_angle.solution import (  # noqa: F401
    axis_angle_from_matrix, exp_so3, log_so3, rodrigues,
)
from labs.manipulators.lab04_quaternions.solution import (  # noqa: F401
    matrix_to_quat, quat_conjugate, quat_multiply, quat_normalize, quat_rotate, quat_slerp,
    quat_to_matrix,
)
from labs.manipulators.lab05_transforms.solution import (  # noqa: F401
    chain, is_transform, make_transform, relative_transform, split_transform,
    transform_inverse, transform_points,
)
from labs.manipulators.toolbox.robots import ARM3_DH, UR5_DH  # noqa: F401


def __getattr__(name):
    # Module 2 reference functions are loaded lazily (they import Module 1 solutions).
    lazy = {
        "dh_transform": "lab06_dh_fk", "fk_dh": "lab06_dh_fk", "fk_dh_frames": "lab06_dh_fk",
        "twist_to_matrix": "lab07_poe", "exp_se3": "lab07_poe", "fk_space": "lab07_poe",
        "fk_body": "lab07_poe", "revolute_screw": "lab07_poe", "screws_from_dh": "lab07_poe",
        "adjoint": "lab07_poe", "log_se3": "lab07_poe",
        "matrix_to_twist": "lab07_poe", "body_screws": "lab07_poe",
        "load_model": "lab08_sim_fk", "sim_site_pose": "lab08_sim_fk", "pose_error": "lab08_sim_fk",
        "dh_to_mjcf": "lab08_sim_fk",
        "jacobian_space": "lab09_jacobian", "jacobian_body": "lab09_jacobian",
        "geometric_jacobian": "lab09_jacobian", "space_to_body_jacobian": "lab09_jacobian",
        "manipulability": "lab10_singularities", "dls_inverse": "lab11_resolved_rate",
    }
    if name in lazy:
        import importlib
        mod = importlib.import_module(f"labs.manipulators.{lazy[name]}.solution")
        return getattr(mod, name)
    raise AttributeError(name)
