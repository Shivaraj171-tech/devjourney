import numpy as np
import pytest

from labs.manipulators.toolbox import (
    ARM3_DH, bias_forces_rnea, forward_dynamics, mass_matrix_rnea, planar2r_coriolis_matrix,
    planar2r_gravity, planar2r_inverse_dynamics, planar2r_mass_matrix, rnea_model,
    run_mujoco_control, simulate,
)
from labs.manipulators.toolbox.models import dh_arm_mjcf, planar2r_mjcf, with_motors
from labs.manipulators.toolbox.robots import ARM3_LINKS, PLANAR2R_DYN as P
from labs.manipulators.toolbox.sim import mujoco_available

needs_mujoco = pytest.mark.skipif(not mujoco_available(), reason="optional: needs mujoco")
Q0, Q1, T = np.array([-1.2, 0.3]), np.array([0.8, -0.6]), 1.5
DT, STEPS = 0.001, 2000


def model_fns(p):
    return (lambda x: planar2r_mass_matrix(x, p),
            lambda x, v: planar2r_coriolis_matrix(x, v, p) @ v + planar2r_gravity(x, p),
            lambda x: planar2r_gravity(x, p))


M_TRUE, B_TRUE, G_TRUE = model_fns(P)


def f_2r(q, qd, tau):
    return forward_dynamics(M_TRUE, B_TRUE, q, qd, tau)


def ref_and_samples(impl):
    ref = impl.quintic_reference(Q0, Q1, T)
    Qr = np.array([np.asarray(ref(k * DT)[0]) for k in range(STEPS + 1)])
    return ref, Qr


def track(impl, ref, wn, factor, steps=STEPS):
    Kp, Kd = impl.critically_damped_gains(wn)
    M_, b_, _ = model_fns(impl.scale_masses(P, factor))
    Q, _ = simulate(f_2r, Q0, [0, 0], DT, steps, "rk4",
                    lambda t, q, qd: impl.computed_torque(q, qd, ref(t), Kp, Kd, M_, b_))
    return np.asarray(Q)


def test_gains_reference_and_scaling(impl):
    assert impl.critically_damped_gains(10.0) == pytest.approx((100.0, 20.0)), "(wn^2, 2 wn)"
    ref = impl.quintic_reference(Q0, Q1, T)
    q, qd, qdd = (np.asarray(x) for x in ref(T / 2))
    np.testing.assert_allclose(q, (Q0 + Q1) / 2, err_msg="half way at T/2")
    np.testing.assert_allclose(qd, 15 / 8 * (Q1 - Q0) / T, err_msg="quintic peak speed 15/8 D/T")
    np.testing.assert_allclose(ref(T + 1.0)[0], Q1, err_msg="holds q1 after T")
    np.testing.assert_allclose(ref(T + 1.0)[1], 0, atol=1e-12, err_msg="at rest after T")
    p = impl.scale_masses(P, 1.2)
    assert p["m1"] == pytest.approx(1.2) and p["I2"] == pytest.approx(1.2 * P["I2"]) and p["l1"] == P["l1"], \
        "scale masses and inertias, keep the geometry"
    assert P["m1"] == 1.0, "scale_masses must return a COPY"
    links = impl.scale_links(ARM3_LINKS, 0.8)
    assert links[1][0] == pytest.approx(1.6) and links[1][1] == ARM3_LINKS[1][1], "mass scaled, COM kept"
    np.testing.assert_allclose(links[2][2], 0.8 * np.asarray(ARM3_LINKS[2][2]), err_msg="inertia scaled")


def test_on_reference_it_is_inverse_dynamics(impl, rng):
    for _ in range(4):
        q, qd, qdd = rng.uniform(-2, 2, 2), rng.uniform(-2, 2, 2), rng.uniform(-5, 5, 2)
        np.testing.assert_allclose(
            impl.computed_torque(q, qd, (q, qd, qdd), 100.0, 20.0, M_TRUE, B_TRUE),
            planar2r_inverse_dynamics(q, qd, qdd, P), atol=1e-10,
            err_msg="with zero error, computed torque is exactly tau = M qdd_d + C qd + g")


def test_error_dynamics_are_linear(impl):
    Kp, Kd = impl.critically_damped_gains(10.0)
    e0, dt = np.array([0.1, -0.05]), 0.0005
    hold = (Q0, np.zeros(2), np.zeros(2))
    Q, _ = simulate(f_2r, Q0 - e0, [0, 0], dt, 2000, "rk4",
                    lambda t, q, qd: impl.computed_torque(q, qd, hold, Kp, Kd, M_TRUE, B_TRUE))
    t = np.arange(2001) * dt
    pred = np.asarray(impl.error_response(e0, [0.0, 0.0], 10.0, t))
    assert pred.shape == (2001, 2), "error_response returns (len(t), n)"
    np.testing.assert_allclose(Q0 - np.asarray(Q), pred, atol=2e-4,
                               err_msg="with an exact model every joint's error obeys e'' + 2wn e' + wn^2 e = 0")


def test_tracking_exact_model_vs_pd(impl):
    ref, Qr = ref_and_samples(impl)
    err_ct = impl.tracking_error(track(impl, ref, 10.0, 1.0), Qr)
    Q_pd, _ = simulate(f_2r, Q0, [0, 0], DT, STEPS, "rk4",
                       lambda t, q, qd: impl.pd_gravity_tracking(q, qd, ref(t), 100.0, 20.0, G_TRUE))
    err_pd = impl.tracking_error(Q_pd, Qr)
    assert err_ct < 1e-3, f"exact model: max tracking error {err_ct:.1e} rad (only the 1 ms hold remains)"
    assert err_pd > 50 * err_ct, f"PD + g with the same gains lags far more ({err_pd:.3f} rad)"


def test_robustness_to_mass_error(impl):
    ref, Qr = ref_and_samples(impl)
    heavy = track(impl, ref, 10.0, 1.2, steps=4000)
    err_heavy = impl.tracking_error(heavy[:STEPS + 1], Qr)
    err_light = impl.tracking_error(track(impl, ref, 10.0, 0.8), Qr)
    assert 0.03 < err_heavy < 0.06, f"masses +20%: expected ~0.041 rad, got {err_heavy:.4f}"
    assert 0.04 < err_light < 0.08, f"masses -20%: expected ~0.061 rad, got {err_light:.4f}"
    err_fast = impl.tracking_error(track(impl, ref, 20.0, 1.2), Qr)
    assert err_heavy / err_fast > 3.0, "doubling wn (4x Kp) cuts the model-error effect by ~4"
    offset = np.asarray(impl.scaled_model_offset(heavy[-1], 0.2, 100.0, M_TRUE, G_TRUE))
    np.testing.assert_allclose(Q1 - heavy[-1], offset, atol=1e-6,
                               err_msg="rest error must equal -delta/((1+delta) Kp) M^-1 g (README step 5)")


@needs_mujoco
def test_mujoco_2r_matches_numpy(impl):
    import mujoco
    ref, Qr = ref_and_samples(impl)
    model = mujoco.MjModel.from_xml_string(with_motors(planar2r_mjcf(P), 2))
    for factor in (1.0, 1.2):
        M_, b_, _ = model_fns(impl.scale_masses(P, factor))
        _, Q, _, _ = run_mujoco_control(
            model, lambda t, q, qd: impl.computed_torque(q, qd, ref(t), 100.0, 20.0, M_, b_), Q0, STEPS * DT)
        np.testing.assert_allclose(Q, track(impl, ref, 10.0, factor), atol=1e-6,
                                   err_msg=f"MuJoCo and numpy must agree (mass factor {factor})")


@needs_mujoco
def test_mujoco_arm3_with_rnea_model(impl):
    import mujoco
    model = mujoco.MjModel.from_xml_string(with_motors(dh_arm_mjcf(ARM3_DH, ARM3_LINKS, timestep=0.002), 3))
    q0, q1 = np.array([0.0, 0.3, -0.5]), np.array([1.0, 1.0, -1.5])
    ref = impl.quintic_reference(q0, q1, 1.5)
    Qr = np.array([np.asarray(ref(k * 0.002)[0]) for k in range(1001)])
    errs = {}
    for factor in (1.0, 1.2):
        rm = rnea_model(ARM3_DH, impl.scale_links(ARM3_LINKS, factor))
        ctrl = lambda t, q, qd, rm=rm: impl.computed_torque(  # noqa: E731
            q, qd, ref(t), 100.0, 20.0, lambda x: mass_matrix_rnea(rm, x), lambda x, v: bias_forces_rnea(rm, x, v))
        _, Q, _, _ = run_mujoco_control(model, ctrl, q0, 2.0)
        errs[factor] = impl.tracking_error(Q, Qr)
    assert errs[1.0] < 1e-3, f"3-DOF arm, exact RNEA model: {errs[1.0]:.1e} rad"
    assert 0.03 < errs[1.2] < 0.09, f"3-DOF arm, masses +20%: expected ~0.057 rad, got {errs[1.2]:.3f}"
