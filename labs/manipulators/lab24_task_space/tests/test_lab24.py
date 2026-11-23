import numpy as np
import pytest

from labs.manipulators.toolbox import (
    ARM3_DH, UR5_DH, exp_so3, fk_space, forward_dynamics, geometric_jacobian, make_gravity_fn,
    mass_matrix_rnea, path_deviation, planar2r_coriolis_matrix, planar2r_gravity, planar2r_mass_matrix,
    rnea_model, run_mujoco_control, screws_from_dh, simulate,
)
from labs.manipulators.toolbox.models import dh_arm_mjcf, with_motors
from labs.manipulators.toolbox.robots import ARM3_LINKS, PLANAR2R_DYN as P, UR5_LINKS
from labs.manipulators.toolbox.sim import mujoco_available

needs_mujoco = pytest.mark.skipif(not mujoco_available(), reason="optional: needs mujoco")
Q0_2R, X_TARGET = np.array([-0.5, 1.2]), np.array([1.2, 0.6])
Q_HOME = np.array([0, -np.pi / 2, np.pi / 2, -np.pi / 2, -np.pi / 2, 0.0])


def mass2(q):
    return planar2r_mass_matrix(q, P)


def f_2r(q, qd, tau):
    return forward_dynamics(mass2, lambda x, v: planar2r_coriolis_matrix(x, v, P) @ v + planar2r_gravity(x, P),
                            q, qd, tau)


def run_2r(impl, law):
    def ctrl(t, q, qd):
        J, e, g = impl.planar2r_jacobian(q, P), X_TARGET - impl.planar2r_fk(q, P), planar2r_gravity(q, P)
        if law == "jt":
            return impl.jacobian_transpose_control(J, qd, e, 100.0, 20.0, g)
        return impl.operational_space_control(J, mass2(q), qd, e, 100.0, 20.0, g)
    Q, _ = simulate(f_2r, Q0_2R, [0, 0], 0.001, 3000, "rk4", ctrl)
    return np.array([impl.planar2r_fk(q, P) for q in Q])


def test_planar_fk_and_jacobian(impl):
    np.testing.assert_allclose(impl.planar2r_fk([0, np.pi / 2], P), [1.0, 0.8], atol=1e-12,
                               err_msg="tip = l1 (c1, s1) + l2 (c12, s12)")
    q, h = np.array([0.3, -0.7]), 1e-6
    num = np.column_stack([(impl.planar2r_fk(q + e, P) - impl.planar2r_fk(q - e, P)) / (2 * h)
                           for e in np.eye(2) * h])
    np.testing.assert_allclose(impl.planar2r_jacobian(q, P), num, atol=1e-8, err_msg="J = d(tip)/dq")


def test_orientation_and_pose_error(impl, rng):
    R = exp_so3(rng.normal(size=3))
    w = np.array([0.2, -0.1, 0.3])
    np.testing.assert_allclose(impl.orientation_error(R, exp_so3(w) @ R), w, atol=1e-12,
                               err_msg="R_d = exp([w]) R (a WORLD-frame turn) must give the error w")
    np.testing.assert_allclose(impl.orientation_error(R, R), np.zeros(3), atol=1e-12)
    T, T_d = np.eye(4), np.eye(4)
    T_d[:3, :3], T_d[:3, 3] = exp_so3(w), [0.1, 0.2, 0.3]
    np.testing.assert_allclose(impl.pose_error(T, T_d), [0.1, 0.2, 0.3, *w], atol=1e-12,
                               err_msg="[p_d - p; orientation error], ordered like [Jv; Jw]")


def test_task_inertia_and_null_space(impl, rng):
    M_ur, S_ur = screws_from_dh(UR5_DH)
    rm = rnea_model(UR5_DH, UR5_LINKS)
    q = rng.uniform(-2, 2, 6)
    J = geometric_jacobian(M_ur, S_ur, q)[:3]   # position only: 3 tasks, 6 joints
    M = mass_matrix_rnea(rm, q)
    Lam = np.asarray(impl.task_space_inertia(J, M))
    np.testing.assert_allclose(Lam, Lam.T, atol=1e-10, err_msg="Lambda is symmetric")
    assert np.all(np.linalg.eigvalsh(Lam) > 0), "Lambda is positive definite"
    N = np.asarray(impl.nullspace_projector(J, M))
    tau0 = rng.normal(size=6)
    np.testing.assert_allclose(J @ np.linalg.solve(M, N @ tau0), np.zeros(3), atol=1e-10,
                               err_msg="null-space torques must not accelerate the end effector")
    np.testing.assert_allclose(N @ N, N, atol=1e-10, err_msg="a projector: N N = N")
    assert np.linalg.matrix_rank(N, tol=1e-8) == 3, "6 joints - 3 tasks = 3 null-space directions"


def test_2r_jacobian_transpose_vs_operational_space(impl):
    x0 = impl.planar2r_fk(Q0_2R, P)
    X_jt, X_os = run_2r(impl, "jt"), run_2r(impl, "osc")
    for name, X in (("J^T", X_jt), ("OSC", X_os)):
        assert np.linalg.norm(X[-1] - X_TARGET) < 1e-6, f"{name}: must reach the Cartesian target in 3 s"
    dev_jt = path_deviation(X_jt, x0, X_TARGET).max()
    dev_os = path_deviation(X_os, x0, X_TARGET).max()
    assert dev_jt > 0.02, f"J^T control curves away from the straight line (~31 mm), got {dev_jt * 1e3:.1f} mm"
    assert dev_os < 0.5 * dev_jt, \
        f"OSC decouples the task directions: straighter path ({dev_os * 1e3:.1f} vs {dev_jt * 1e3:.1f} mm)"


@needs_mujoco
def test_mujoco_arm3_jacobian_transpose(impl):
    import mujoco
    model = mujoco.MjModel.from_xml_string(with_motors(dh_arm_mjcf(ARM3_DH, ARM3_LINKS, timestep=0.002), 3))
    M3, S3 = screws_from_dh(ARM3_DH)
    g = make_gravity_fn(ARM3_DH, ARM3_LINKS)
    q0 = np.array([0.0, 0.5, -1.0])
    p_t = fk_space(M3, S3, q0)[:3, 3] + np.array([-0.15, 0.15, 0.05])

    def ctrl(t, q, qd):
        e = p_t - fk_space(M3, S3, q)[:3, 3]
        return impl.jacobian_transpose_control(geometric_jacobian(M3, S3, q)[:3], qd, e, 300.0, 40.0, g(q))

    _, Q, _, _ = run_mujoco_control(model, ctrl, q0, 1.5)
    err = np.linalg.norm(fk_space(M3, S3, Q[-1])[:3, 3] - p_t)
    assert err < 1e-5, f"3-DOF arm in MuJoCo: J^T + gravity must reach the point ({err:.1e} m left)"


@needs_mujoco
def test_mujoco_ur5_pose_with_orientation(impl):
    import mujoco

    from labs.manipulators.toolbox.sim import MujocoDynamics
    model = mujoco.MjModel.from_xml_string(with_motors(dh_arm_mjcf(UR5_DH, UR5_LINKS, timestep=0.002), 6))
    dyn = MujocoDynamics(model)
    M6, S6 = screws_from_dh(UR5_DH)
    T0 = fk_space(M6, S6, Q_HOME)
    T_d = T0.copy()
    T_d[:3, 3] += [0.1, -0.1, -0.1]
    T_d[:3, :3] = exp_so3([0.3, -0.2, 0.4]) @ T0[:3, :3]

    def ctrl(t, q, qd):
        e = impl.pose_error(fk_space(M6, S6, q), T_d)
        return impl.operational_space_control(geometric_jacobian(M6, S6, q), dyn.mass(q), qd, e,
                                              100.0, 20.0, dyn.gravity(q))

    _, Q, _, _ = run_mujoco_control(model, ctrl, Q_HOME, 1.5)
    e = impl.pose_error(fk_space(M6, S6, Q[-1]), T_d)
    assert np.linalg.norm(e[:3]) < 1e-4 and np.linalg.norm(e[3:]) < 1e-3, \
        f"UR5 must reach position AND orientation (left: {np.linalg.norm(e[:3]):.1e} m, " \
        f"{np.linalg.norm(e[3:]):.1e} rad)"
    X = np.array([fk_space(M6, S6, q)[:3, 3] for q in Q])
    dev = path_deviation(X, T0[:3, 3], T_d[:3, 3]).max()
    assert dev < 3e-3, f"OSC moves the gripper almost straight (deviation {dev * 1e3:.1f} mm)"
