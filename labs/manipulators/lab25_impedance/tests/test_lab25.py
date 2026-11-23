import numpy as np
import pytest

from labs.manipulators.toolbox import (
    ARM3_DH, arm3_ik, fk_space, forward_dynamics, geometric_jacobian, make_gravity_fn,
    planar2r_coriolis_matrix, planar2r_gravity, planar2r_mass_matrix, run_mujoco_control,
    screws_from_dh, simulate,
)
from labs.manipulators.toolbox.models import arm3_table_mjcf, dh_arm_mjcf, with_motors
from labs.manipulators.toolbox.robots import ARM3_LINKS, PLANAR2R_DYN as P
from labs.manipulators.toolbox.sim import mujoco_available

needs_mujoco = pytest.mark.skipif(not mujoco_available(), reason="optional: needs mujoco")
M3, S3 = screws_from_dh(ARM3_DH)
K3, D3 = np.diag([500.0, 300.0, 800.0]), np.diag([40.0, 30.0, 50.0])
X0 = np.array([0.45, 0.1, 0.35])


def tip2r(q):
    return np.array([np.cos(q[0]) + 0.8 * np.cos(q[0] + q[1]), np.sin(q[0]) + 0.8 * np.sin(q[0] + q[1])])


def jac2r(q):
    s1, c1, s12, c12 = np.sin(q[0]), np.cos(q[0]), np.sin(q[0] + q[1]), np.cos(q[0] + q[1])
    return np.array([[-s1 - 0.8 * s12, -0.8 * s12], [c1 + 0.8 * c12, 0.8 * c12]])


def arm3_controller(impl, x0_fn, K, D):
    g = make_gravity_fn(ARM3_DH, ARM3_LINKS)

    def ctrl(t, q, qd):
        return impl.impedance_torque(geometric_jacobian(M3, S3, q)[:3], qd, fk_space(M3, S3, q)[:3, 3],
                                     x0_fn(t), K, D, g(q))
    return ctrl


def test_impedance_law(impl, rng):
    J, qd, x, x0, g = rng.normal(size=(3, 3)), rng.normal(size=3), rng.normal(size=3), rng.normal(size=3), \
        rng.normal(size=3)
    np.testing.assert_allclose(impl.impedance_torque(J, qd, x, x0, K3, D3, g),
                               J.T @ (K3 @ (x0 - x) - D3 @ J @ qd) + g, atol=1e-12,
                               err_msg="J^T (K (x0 - x) - D J qd) + g with matrix K, D")
    np.testing.assert_allclose(impl.impedance_torque(J, qd, x, x0, 200.0, 10.0, g),
                               J.T @ (200 * (x0 - x) - 10 * J @ qd) + g, atol=1e-12,
                               err_msg="scalar K, D mean K I, D I")
    np.testing.assert_allclose(impl.impedance_torque(J, np.zeros(3), x0, x0, K3, D3, g), g,
                               err_msg="at rest on x0 only gravity compensation remains")


def test_deflection_and_stiffness_estimate(impl, rng):
    np.testing.assert_allclose(impl.predicted_deflection(K3, [5.0, 3.0, -8.0]), [0.01, 0.01, -0.01],
                               err_msg="x - x0 = K^-1 f")
    A = rng.normal(size=(3, 3))
    K = A @ A.T + 100 * np.eye(3)
    forces = rng.normal(size=(5, 3))
    disps = np.linalg.solve(K, forces.T).T
    np.testing.assert_allclose(impl.estimate_stiffness(forces, disps), K, rtol=1e-9,
                               err_msg="least squares on f_k = K d_k (rows are experiments)")


def test_xfrc_layout(impl):
    np.testing.assert_allclose(impl.xfrc_for_point_force([0, 0, 2.0], [1.0, 0, 0], [0, 0, 0]),
                               [0, 0, 2.0, 0, -2.0, 0], atol=1e-12,
                               err_msg="MuJoCo order is [force; torque], torque = (point - com) x force")


def test_2r_tip_stiffness_numpy(impl):
    K, D, q0 = np.diag([400.0, 200.0]), np.diag([30.0, 20.0]), np.array([-0.4, 1.1])
    x0, f_ext = tip2r(q0), np.array([4.0, -3.0])

    def f(q, qd, tau):  # the arm, plus an external force f_ext pushing on the tip: + J^T f_ext
        return forward_dynamics(lambda x: planar2r_mass_matrix(x, P),
                                lambda x, v: planar2r_coriolis_matrix(x, v, P) @ v + planar2r_gravity(x, P),
                                q, qd, tau + jac2r(q).T @ f_ext)

    ctrl = lambda t, q, qd: impl.impedance_torque(jac2r(q), qd, tip2r(q), x0, K, D,  # noqa: E731
                                                  planar2r_gravity(q, P))
    Q, _ = simulate(f, q0, [0, 0], 0.002, 2000, "rk4", ctrl)
    np.testing.assert_allclose(tip2r(np.asarray(Q)[-1]) - x0, impl.predicted_deflection(K, f_ext), atol=1e-7,
                               err_msg="pushed with f, the tip must settle K^-1 f away from x0")


@needs_mujoco
def test_mujoco_push_measures_stiffness(impl):
    import mujoco
    model = mujoco.MjModel.from_xml_string(with_motors(dh_arm_mjcf(ARM3_DH, ARM3_LINKS, timestep=0.002), 3))
    site, body = model.site("ee").id, model.body("link3").id
    ctrl = arm3_controller(impl, lambda t: X0, K3, D3)
    q0 = arm3_ik(X0, "front", "up")
    forces, disps = [], []
    for f in ([5.0, 0, 0], [0, 5.0, 0], [0, 0, -5.0]):
        def push(m, d, t, f=f):
            d.xfrc_applied[body] = impl.xfrc_for_point_force(f, d.site_xpos[site], d.xipos[body])
        _, Q, Qd, _ = run_mujoco_control(model, ctrl, q0, 1.2, before_step=push)
        assert np.abs(Qd[-1]).max() < 1e-5, "the pushed arm must come to rest"
        forces.append(f)
        disps.append(fk_space(M3, S3, Q[-1])[:3, 3] - X0)
    K_est = np.asarray(impl.estimate_stiffness(forces, disps))
    np.testing.assert_allclose(K_est, K3, rtol=5e-3, atol=0.5,
                               err_msg="pushing the simulated hand must reveal the stiffness you set")


@needs_mujoco
def test_mujoco_table_contact_is_stable(impl):
    import mujoco
    table_z, r = 0.10, 0.02
    model = mujoco.MjModel.from_xml_string(arm3_table_mjcf(ARM3_DH, ARM3_LINKS, table_z, tip_radius=r))
    K, D = np.diag([400.0, 400.0, 500.0]), np.diag([40.0, 40.0, 45.0])
    xa, x_goal = np.array([0.5, 0.0, 0.25]), np.array([0.5, 0.0, table_z + r - 0.02])  # 2 cm "into" it

    def x0(t):
        s = min(t, 1.0)
        return xa + (10 * s**3 - 15 * s**4 + 6 * s**5) * (x_goal - xa)

    log = []
    rec = lambda m, d, t: log.append((t, impl.contact_normal_force(m, d, "tip", "table")))  # noqa: E731
    _, Q, _, _ = run_mujoco_control(model, arm3_controller(impl, x0, K, D), arm3_ik(xa, "front", "up"), 2.5,
                                    before_step=rec)
    t, fn = np.array(log).T
    assert fn[t < 0.7].max() == 0.0, "no contact while the hand is still above the table"
    settled = fn[t > 2.0]
    x_end = fk_space(M3, S3, Q[-1])[:3, 3]
    expected = -(K @ (x_goal - x_end))[2]
    assert settled.mean() == pytest.approx(expected, rel=0.01), \
        f"contact force {settled.mean():.3f} N must equal the spring's K (x0 - x) = {expected:.3f} N"
    assert 9.5 < settled.mean() < 10.5, "500 N/m x 2 cm = about 10 N"
    assert settled.std() < 0.01, "a stable contact: the force must be steady, not chattering"
    assert fn[t > 1.2].min() > 9.0, "the hand must stay on the table (no bouncing off)"
