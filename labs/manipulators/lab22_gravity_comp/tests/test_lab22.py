import numpy as np
import pytest

from labs.manipulators.toolbox import (
    ARM3_DH, forward_dynamics, gravity_rnea, mass_matrix_rnea, pd_torque, planar2r_coriolis_matrix,
    planar2r_gravity, planar2r_mass_matrix, rnea_model, run_mujoco_control, simulate,
)
from labs.manipulators.toolbox.models import dh_arm_mjcf, planar2r_mjcf, with_motors
from labs.manipulators.toolbox.robots import ARM3_LINKS, PLANAR2R_DYN as P
from labs.manipulators.toolbox.sim import mujoco_available

needs_mujoco = pytest.mark.skipif(not mujoco_available(), reason="optional: needs mujoco")
Q_DES = np.array([0.5, 0.3])
KP, KD = 50.0, 2 * np.sqrt(50.0)


def g2(q):
    return planar2r_gravity(q, P)


def mass2(q):
    return planar2r_mass_matrix(q, P)


def f_2r(q, qd, tau):
    return forward_dynamics(mass2, lambda x, v: planar2r_coriolis_matrix(x, v, P) @ v + g2(x),
                            q, qd, tau)


def test_control_laws(impl):
    q, qd = np.array([0.1, -0.4]), np.array([0.3, 0.2])
    np.testing.assert_allclose(impl.pd_gravity(q, qd, Q_DES, KP, KD, g2),
                               pd_torque(q, qd, Q_DES, KP, KD) + g2(q), atol=1e-12,
                               err_msg="PD + g(q) at the CURRENT q")
    np.testing.assert_allclose(impl.pd_gravity_desired(q, qd, Q_DES, KP, KD, g2),
                               pd_torque(q, qd, Q_DES, KP, KD) + g2(Q_DES), atol=1e-12,
                               err_msg="PD + g(q_des): constant feedforward")
    np.testing.assert_allclose(impl.pd_gravity(Q_DES, [0, 0], Q_DES, KP, KD, g2), g2(Q_DES),
                               err_msg="at rest on target the only torque left is g(q_des)")


def test_gravity_fn_from_rnea(impl):
    g = impl.make_gravity_fn(ARM3_DH, ARM3_LINKS)
    model = rnea_model(ARM3_DH, ARM3_LINKS)
    for q in ([0.0, 0.0, 0.0], [0.3, 1.0, -0.5]):
        np.testing.assert_allclose(g(np.array(q)), gravity_rnea(model, q), atol=1e-12,
                                   err_msg="make_gravity_fn must return lab 19's g(q)")
    np.testing.assert_allclose(impl.make_gravity_fn(ARM3_DH, ARM3_LINKS, (0, 0, 0))([0.3, 1.0, -0.5]),
                               np.zeros(3), atol=1e-12, err_msg="no gravity -> g(q) = 0")


@pytest.mark.parametrize("law", ["pd_gravity", "pd_gravity_desired"])
def test_zero_steady_state_error_numpy(impl, law):
    ctrl = lambda t, q, qd: getattr(impl, law)(q, qd, Q_DES, KP, KD, g2)  # noqa: E731
    Q, Qd = simulate(f_2r, [0, 0], [0, 0], 0.002, 2500, "rk4", ctrl)
    err = np.abs(Q_DES - np.asarray(Q)[-1]).max()
    assert err < 1e-6, f"{law}: error {err:.2e} rad; PD alone at the same gains leaves 0.31 rad"


def test_lyapunov_decreases(impl):
    ctrl = lambda t, q, qd: impl.pd_gravity(q, qd, Q_DES, KP, KD, g2)  # noqa: E731
    dt = 0.0005
    Q, Qd = simulate(f_2r, [-1.0, 0.5], [0, 0], dt, 6000, "rk4", ctrl)
    V = np.array([impl.lyapunov(q, v, Q_DES, KP, mass2) for q, v in zip(Q, Qd)])
    e0 = Q_DES - np.array([-1.0, 0.5])
    assert V[0] == pytest.approx(0.5 * KP * e0 @ e0), "V(0) = 1/2 e^T Kp e when starting at rest"
    assert np.diff(V).max() < 1e-6 * V[0], "V must never increase (dV/dt = -qd^T Kd qd <= 0)"
    assert V[-1] < 1e-5 * V[0], "and it drains to zero: the arm settles on the target"
    dV = np.gradient(V, dt)[1:-1]
    rate = np.array([impl.lyapunov_rate(v, KD) for v in Qd])[1:-1]
    assert np.abs(dV - rate).max() < 0.01 * np.abs(rate).max(), \
        "the measured dV/dt must match -qd^T Kd qd (that's the whole stability argument)"


def test_wrong_model_leaves_an_offset(impl):
    P_wrong = dict(P, m1=1.2 * P["m1"], m2=1.2 * P["m2"])
    g_wrong = lambda q: planar2r_gravity(q, P_wrong)  # noqa: E731
    ctrl = lambda t, q, qd: impl.pd_gravity(q, qd, Q_DES, KP, KD, g_wrong)  # noqa: E731
    Q, _ = simulate(f_2r, [0, 0], [0, 0], 0.002, 2500, "rk4", ctrl)
    pred = np.asarray(impl.model_error_offset(Q_DES, KP, g2, g_wrong))
    np.testing.assert_allclose(np.asarray(Q)[-1], pred, atol=1e-6,
                               err_msg="rest where Kp (q_des - q) = g_true(q) - g_model(q)")
    assert 0.04 < np.abs(Q_DES - pred).max() < 0.07, "20% too heavy: overshoots the target by ~0.05 rad"


@needs_mujoco
def test_mujoco_2r(impl):
    import mujoco
    model = mujoco.MjModel.from_xml_string(with_motors(planar2r_mjcf(P), 2))
    _, Q, _, _ = run_mujoco_control(model, lambda t, q, qd: impl.pd_gravity(q, qd, Q_DES, KP, KD, g2),
                                    [0, 0], 5.0)
    assert np.abs(Q_DES - Q[-1]).max() < 1e-6, "MuJoCo's 2R arm must settle exactly on target"


@needs_mujoco
def test_mujoco_arm3_with_rnea_gravity(impl):
    import mujoco
    model = mujoco.MjModel.from_xml_string(with_motors(dh_arm_mjcf(ARM3_DH, ARM3_LINKS), 3))
    q_des = np.array([0.5, 0.6, -0.8])
    # per-joint gains scaled by each joint's own inertia (diagonal of M at the target), wn = 10
    J = np.diag(mass_matrix_rnea(rnea_model(ARM3_DH, ARM3_LINKS), q_des))
    Kp, Kd = J * 100.0, J * 20.0
    g = impl.make_gravity_fn(ARM3_DH, ARM3_LINKS)
    _, Q, _, _ = run_mujoco_control(model, lambda t, q, qd: impl.pd_gravity(q, qd, q_des, Kp, Kd, g),
                                    [0, 0, 0], 2.5)
    err = np.abs(q_des - Q[-1]).max()
    assert err < 1e-4, f"3-DOF arm with RNEA gravity compensation: error {err:.1e} rad (PD alone: 0.35)"
