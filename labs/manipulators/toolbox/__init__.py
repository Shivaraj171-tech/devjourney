"""The reference toolbox: earlier labs' functions, so later labs build on solid ground.

SPOILER WARNING: this re-exports the reference solutions of earlier labs. Finish a
lab before you read the code behind its toolbox functions. Starters from lab 02 on
import from here so a bug in one lab can't cascade into the next.

Module 1 (labs 01-05): rotations, Euler, exp/log, quaternions, transforms.
Module 2 (labs 06-08): DH and PoE forward kinematics, MJCF generation.
Module 3 helpers (Jacobians, sims) live in `toolbox.sim` and lab solutions; import
them explicitly where needed.
Modules 4-6 (labs 12-20): IK (analytic, Newton, Levenberg-Marquardt), time scaling and
trajectories, Lagrangian/Newton-Euler dynamics. Loaded lazily by name, like Modules 2-3.
`toolbox.models` writes MuJoCo models with real inertias for the dynamics labs.
Modules 7-8 (labs 21-28): PD, gravity compensation, computed torque, task-space and impedance
control, contacts and grasp quality. `toolbox.models` adds torque motors and contact scenes
(table, pinch rig, UR5e + gripper); `toolbox.sim.MujocoDynamics` evaluates M(q) and g(q) fast.
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
from labs.manipulators.toolbox.robots import ARM3_DH, UR5E_DH  # noqa: F401


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
        "path_deviation": "lab11_resolved_rate",
        # Module 4: inverse kinematics
        "wrap_to_pi": "lab12_analytic_ik", "arm3_ik_all": "lab12_analytic_ik",
        "arm3_ik": "lab12_analytic_ik", "elbow_is_up": "lab12_analytic_ik",
        "body_twist_error": "lab13_newton_ik", "error_norms": "lab13_newton_ik",
        "ik_newton": "lab13_newton_ik", "ik_newton_position": "lab13_newton_ik",
        "dls_step": "lab14_dls_ik", "ik_lm": "lab14_dls_ik", "clamp_to_limits": "lab14_dls_ik",
        "within_limits": "lab14_dls_ik", "distinct_solutions": "lab14_dls_ik",
        "multi_start_ik": "lab14_dls_ik", "select_solution": "lab14_dls_ik",
        "make_pose": "lab15_ur5e_ik", "solve_ur5e_pose": "lab15_ur5e_ik",
        # Module 5: trajectories
        "cubic_scaling": "lab16_time_scaling", "quintic_scaling": "lab16_time_scaling",
        "trapezoid_profile": "lab16_time_scaling", "trapezoid_sample": "lab16_time_scaling",
        "min_time_polynomial": "lab16_time_scaling",
        "joint_trajectory": "lab17_trajectories", "cartesian_poses": "lab17_trajectories",
        "cartesian_trajectory": "lab17_trajectories", "sync_trapezoid": "lab17_trajectories",
        # Module 6: dynamics
        "planar2r_mass_matrix": "lab18_lagrange_2r", "planar2r_coriolis_matrix": "lab18_lagrange_2r",
        "planar2r_gravity": "lab18_lagrange_2r", "planar2r_inverse_dynamics": "lab18_lagrange_2r",
        "planar2r_energy": "lab18_lagrange_2r",
        "spatial_inertia": "lab19_newton_euler", "com_frames": "lab19_newton_euler",
        "rnea": "lab19_newton_euler", "mass_matrix_rnea": "lab19_newton_euler",
        "bias_forces_rnea": "lab19_newton_euler", "gravity_rnea": "lab19_newton_euler",
        "rnea_model": "lab19_newton_euler", "ad_twist": "lab19_newton_euler",
        "forward_dynamics": "lab20_forward_dynamics", "rk4_step": "lab20_forward_dynamics",
        "semi_implicit_euler_step": "lab20_forward_dynamics", "simulate": "lab20_forward_dynamics",
        # Module 7: control
        "pd_torque": "lab21_pd_control", "pd_gains": "lab21_pd_control",
        "step_metrics": "lab21_pd_control", "gravity_droop": "lab21_pd_control",
        "run_mujoco_control": "lab21_pd_control",
        "pd_gravity": "lab22_gravity_comp", "pd_gravity_desired": "lab22_gravity_comp",
        "make_gravity_fn": "lab22_gravity_comp", "lyapunov": "lab22_gravity_comp",
        "critically_damped_gains": "lab23_computed_torque",
        "quintic_reference": "lab23_computed_torque", "computed_torque": "lab23_computed_torque",
        "tracking_error": "lab23_computed_torque", "scale_links": "lab23_computed_torque",
        "scale_masses": "lab23_computed_torque",
        "orientation_error": "lab24_task_space",
        "jacobian_transpose_control": "lab24_task_space",
        "task_space_inertia": "lab24_task_space",
        "operational_space_control": "lab24_task_space",
        "nullspace_projector": "lab24_task_space",
        "impedance_torque": "lab25_impedance", "predicted_deflection": "lab25_impedance",
        "xfrc_for_point_force": "lab25_impedance", "estimate_stiffness": "lab25_impedance",
        "contact_normal_force": "lab25_impedance",
        "contact_frame": "lab26_grasp_basics", "in_friction_cone": "lab26_grasp_basics",
        "friction_cone_edges": "lab26_grasp_basics", "contact_wrench": "lab26_grasp_basics",
        "grasp_matrix": "lab26_grasp_basics", "gravity_wrench": "lab26_grasp_basics",
        "min_friction_two_finger": "lab26_grasp_basics",
        "box_contact_forces": "lab26_grasp_basics",
        "scaled_grasp_matrix": "lab27_grasp_quality",
        "min_singular_value": "lab27_grasp_quality", "primitive_wrenches": "lab27_grasp_quality",
        "epsilon_metric": "lab27_grasp_quality", "is_force_closure": "lab27_grasp_quality",
        "tool_model": "lab28_pick_and_place", "tool_pose": "lab28_pick_and_place",
        "grasp_yaw": "lab28_pick_and_place", "plan_waypoints": "lab28_pick_and_place",
        "segment_reference": "lab28_pick_and_place",
        "run_pick_and_place": "lab28_pick_and_place",
    }
    if name in lazy:
        import importlib
        mod = importlib.import_module(f"labs.manipulators.{lazy[name]}.solution")
        return getattr(mod, name)
    raise AttributeError(name)
