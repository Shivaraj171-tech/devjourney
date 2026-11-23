import numpy as np
import pytest

from labs.manipulators.toolbox import (
    forward_dynamics, planar2r_coriolis_matrix, planar2r_gravity, planar2r_mass_matrix, simulate,
)
from labs.manipulators.toolbox.models import pendulum_mjcf, planar2r_mjcf, with_motors
from labs.manipulators.toolbox.robots import PLANAR2R_DYN as P
from labs.manipulators.toolbox.sim import mujoco_available

needs_mujoco = pytest.mark.skipif(not mujoco_available(), reason="optional: needs mujoco")
J1 = P["I1"] + P["m1"] * P["lc1"] ** 2   # link 1 alone, about its joint: 1/3 kg m^2
WN = 10.0
Q_DES = np.array([0.5, 0.3])


def f_2r(q, qd, tau):
    return forward_dynamics(lambda x: planar2r_mass_matrix(x, P),
                            lambda x, v: planar2r_coriolis_matrix(x, v, P) @ v + planar2r_gravity(x, P),
                            q, qd, tau)


def unit_joint_step(impl, zeta, dt=0.001, T=2.0):
    kp, kd = impl.pd_gains(J1, WN, zeta)
    ctrl = lambda t, q, qd: impl.pd_torque(q, qd, [1.0], kp, kd)  # noqa: E731
    Q, _ = simulate(lambda q, qd, tau: tau / J1, [0.0], [0.0], dt, int(round(T / dt)), "rk4", ctrl)
    return np.arange(len(Q)) * dt, np.asarray(Q)[:, 0], ctrl


def test_pd_torque(impl):
    tau = impl.pd_torque([0.1, -0.2], [1.0, 0.5], [0.3, 0.3], 10.0, [2.0, 4.0])
    np.testing.assert_allclose(tau, [10 * 0.2 - 2 * 1.0, 10 * 0.5 - 4 * 0.5], atol=1e-12,
                               err_msg="Kp (q_des - q) + Kd (0 - qd), element-wise")
    tau = impl.pd_torque([0.0], [1.0], [0.0], 1.0, 3.0, qd_des=[1.0])
    np.testing.assert_allclose(tau, [0.0], atol=1e-12, err_msg="no torque when q and qd are on target")


def test_gains_and_textbook_formulas(impl):
    kp, kd = impl.pd_gains(0.5, 10.0, 0.7)
    assert (kp, kd) == pytest.approx((50.0, 7.0)), "kp = J wn^2, kd = 2 zeta wn J"
    assert impl.overshoot_from_zeta(0.5) == pytest.approx(0.1630, abs=1e-4), "exp(-zeta pi / sqrt(1 - zeta^2))"
    assert impl.overshoot_from_zeta(1.0) == 0.0 and impl.overshoot_from_zeta(1.5) == 0.0, \
        "critically damped and overdamped: no overshoot"
    assert impl.settling_time_estimate(10.0, 0.5) == pytest.approx(np.log(50) / 5), \
        "envelope exp(-zeta wn t) = 0.02 -> t = ln(50) / (zeta wn)"


def test_step_metrics_on_known_curves(impl):
    t = np.linspace(0, 10, 100001)
    m = impl.step_metrics(t, 2.0 - 2.0 * np.exp(-t), 0.0, 2.0)  # first order, tau = 1 s
    assert m["overshoot"] == 0.0, "a first-order response never overshoots"
    assert m["rise_time"] == pytest.approx(np.log(9), abs=1e-3), "10-90% rise of 1 - e^-t is ln 9"
    assert m["settling_time"] == pytest.approx(np.log(50), abs=1e-3), "2% band reached at ln 50"
    assert m["ss_error"] == pytest.approx(2.0 * np.exp(-10), abs=1e-9), "y_target - y[-1]"
    z, wn = 0.3, 4.0
    wd = wn * np.sqrt(1 - z**2)
    y = 1 - np.exp(-z * wn * t) * (np.cos(wd * t) + z / np.sqrt(1 - z**2) * np.sin(wd * t))
    m = impl.step_metrics(t, 3.0 - 2.0 * y, 3.0, 1.0)  # a DOWNWARD step from 3 to 1
    assert m["overshoot"] == pytest.approx(np.exp(-z * np.pi / np.sqrt(1 - z**2)), abs=1e-4), \
        "normalise by (y_target - y_start) so downward steps work too"


def test_gains_vs_overshoot_numpy(impl):
    measured = []
    for zeta in (0.2, 0.5, 0.7, 1.0):
        t, y, _ = unit_joint_step(impl, zeta)
        m = impl.step_metrics(t, y, 0.0, 1.0)
        measured.append(m["overshoot"])
        assert m["overshoot"] == pytest.approx(impl.overshoot_from_zeta(zeta), abs=0.006), \
            f"J qdd = tau with PD from pd_gains(zeta={zeta}) must overshoot as the formula says"
        if zeta < 1:
            assert m["settling_time"] == pytest.approx(impl.settling_time_estimate(WN, zeta), rel=0.1), \
                "the envelope estimate of settling time holds to ~10% for zeta < 1"
    assert np.all(np.diff(measured) < 0), "more damping, less overshoot"


@needs_mujoco
def test_mujoco_loop_matches_numpy(impl):
    import mujoco
    model = mujoco.MjModel.from_xml_string(pendulum_mjcf(P["m1"], P["lc1"], P["I1"]))
    t_np, y_np, ctrl = unit_joint_step(impl, 0.5)
    t, Q, Qd, Tau = (np.asarray(x) for x in impl.run_mujoco_control(model, ctrl, [0.0], 2.0))
    assert t.shape == (2001,) and Q.shape == Qd.shape == (2001, 1) and Tau.shape == (2000, 1), \
        "t, Q, Qd have N + 1 rows (row 0 = initial state), Tau has N"
    assert Tau[0, 0] == pytest.approx(impl.pd_gains(J1, WN, 0.5)[0]), "first torque = kp * 1 rad"
    np.testing.assert_allclose(Q[:, 0], y_np, atol=1e-6,
                               err_msg="MuJoCo (motor, RK4, 1 ms) and the numpy simulator must agree")
    seen = []
    impl.run_mujoco_control(model, ctrl, [0.0], 0.01, before_step=lambda m, d, tk: seen.append(tk))
    assert len(seen) == 10 and seen[1] == pytest.approx(0.001), "before_step(model, data, t) every step"


def test_gravity_droop_numpy(impl):
    g = lambda q: planar2r_gravity(q, P)  # noqa: E731
    errors = []
    for kp in (50.0, 100.0, 200.0):
        kd = 2 * np.sqrt(kp)
        ctrl = lambda t, q, qd, kp=kp, kd=kd: impl.pd_torque(q, qd, Q_DES, kp, kd)  # noqa: E731
        Q, Qd = simulate(f_2r, [0, 0], [0, 0], 0.002, 2500, "rk4", ctrl)
        Q = np.asarray(Q)
        assert np.abs(np.asarray(Qd)[-1]).max() < 1e-6, "the 2R arm must have come to rest after 5 s"
        pred = np.asarray(impl.gravity_droop(Q_DES, kp, g))
        np.testing.assert_allclose(Q[-1], pred, atol=1e-6,
                                   err_msg="measured rest position != Kp (q_des - q) = g(q) prediction")
        errors.append(np.abs(Q_DES - Q[-1]).max())
    assert errors[0] > 0.3, f"PD alone with kp = 50 droops by ~0.31 rad (got {errors[0]:.3f})"
    ratios = np.array(errors[:-1]) / np.array(errors[1:])
    assert np.all((ratios > 1.9) & (ratios < 2.3)), \
        f"doubling kp roughly halves the gravity error (ratios {ratios})"


@needs_mujoco
def test_gravity_droop_mujoco(impl):
    import mujoco
    model = mujoco.MjModel.from_xml_string(with_motors(planar2r_mjcf(P), 2))
    kp, kd = 100.0, 20.0
    ctrl = lambda t, q, qd: impl.pd_torque(q, qd, Q_DES, kp, kd)  # noqa: E731
    _, Q, _, _ = impl.run_mujoco_control(model, ctrl, [0.0, 0.0], 5.0)
    pred = impl.gravity_droop(Q_DES, kp, lambda q: planar2r_gravity(q, P))
    np.testing.assert_allclose(np.asarray(Q)[-1], pred, atol=1e-6,
                               err_msg="MuJoCo's arm must droop exactly where your g(q) predicts")
