import numpy as np
import pytest

from labs.manipulators.toolbox import (
    ARM3_DH, bias_forces_rnea, mass_matrix_rnea, planar2r_coriolis_matrix, planar2r_energy,
    planar2r_gravity, planar2r_inverse_dynamics, planar2r_mass_matrix,
)
from labs.manipulators.toolbox.models import dh_arm_mjcf, planar2r_mjcf
from labs.manipulators.toolbox.robots import ARM3_LINKS, PLANAR2R_DYN as P
from labs.manipulators.toolbox.sim import mujoco_available

needs_mujoco = pytest.mark.skipif(not mujoco_available(), reason="optional: needs mujoco")
Q_GENTLE = np.array([-1.2, 0.3])  # hanging, small swings: regular motion
Q_WILD = np.array([0.4, 0.8])     # raised: chaotic double-pendulum motion


def mass(q):
    return planar2r_mass_matrix(q, P)


def bias(q, qd):
    return planar2r_coriolis_matrix(q, qd, P) @ qd + planar2r_gravity(q, P)


def energy(q, qd):
    return sum(planar2r_energy(q, qd, P))


@pytest.fixture
def f(impl):
    return lambda q, qd, tau: impl.forward_dynamics(mass, bias, q, qd, tau)


def oscillator(q, qd, tau):  # q'' = -q + tau
    return -q + tau


def test_forward_dynamics_inverts_inverse_dynamics(impl, rng):
    for _ in range(5):
        q, qd, qdd = rng.uniform(-3, 3, 2), rng.uniform(-2, 2, 2), rng.uniform(-5, 5, 2)
        tau = planar2r_inverse_dynamics(q, qd, qdd, P)
        np.testing.assert_allclose(impl.forward_dynamics(mass, bias, q, qd, tau), qdd, atol=1e-10,
                                   err_msg="qdd = M^-1 (tau - C qd - g) must undo tau = M qdd + C qd + g")


def test_single_steps(impl):
    q, v, dt, tau = np.array([1.0]), np.array([0.5]), 0.1, np.array([0.2])
    np.testing.assert_allclose(impl.explicit_euler_step(oscillator, q, v, dt, tau), ([1.05], [0.42]),
                               err_msg="explicit: both updates from the old state")
    np.testing.assert_allclose(impl.semi_implicit_euler_step(oscillator, q, v, dt, tau), ([1.042], [0.42]),
                               err_msg="semi-implicit: position uses the NEW velocity")
    q1, v1 = impl.rk4_step(oscillator, np.array([1.0]), np.array([0.0]), dt, np.array([0.0]))
    assert q1[0] == pytest.approx(np.cos(dt), abs=1e-7) and v1[0] == pytest.approx(-np.sin(dt), abs=1e-7), \
        "RK4 on q'' = -q: one step matches cos/sin to O(dt^5)"


def test_simulate(impl, f):
    calls = []

    def hold(t, q, qd):
        calls.append(t)
        return planar2r_gravity(q, P)

    Q, Qd = (np.asarray(x) for x in impl.simulate(f, Q_WILD, [0, 0], 0.002, 100, "semi_implicit", hold))
    assert Q.shape == Qd.shape == (101, 2), "steps + 1 rows, row 0 = initial state"
    np.testing.assert_allclose(Q, np.tile(Q_WILD, (101, 1)), atol=1e-12,
                               err_msg="tau = g(q) (gravity compensation) must hold the arm still")
    assert len(calls) == 100 and calls[1] == pytest.approx(0.002), "tau_fn once per step, at t = k dt"
    Q, _ = impl.simulate(oscillator, [1.0], [0.0], 0.01, 314, "rk4")
    assert np.asarray(Q)[-1, 0] == pytest.approx(np.cos(3.14), abs=1e-8), "tau_fn None = zero torque"


def test_convergence_orders(impl, f):
    T, dts = 0.5, [0.02, 0.01, 0.005]
    ref = np.asarray(impl.simulate(f, Q_WILD, [0, 0], T / 4000, 4000, "rk4")[0])[-1]
    orders = {}
    for method in ("euler", "rk4"):
        errs = [np.abs(np.asarray(impl.simulate(f, Q_WILD, [0, 0], dt, int(round(T / dt)), method)[0])[-1]
                       - ref).max() for dt in dts]
        orders[method] = impl.convergence_order(errs, dts)
    assert 0.8 < orders["euler"] < 1.2, f"explicit Euler should be 1st order, measured {orders['euler']:.2f}"
    assert 3.7 < orders["rk4"] < 4.3, f"RK4 should be 4th order, measured {orders['rk4']:.2f}"
    assert impl.convergence_order([1e-2, 2.5e-3], [0.2, 0.1]) == pytest.approx(2.0)


def test_energy_conservation(impl, f):
    drift = {}
    for method in ("euler", "semi_implicit", "rk4"):
        Q, Qd = impl.simulate(f, Q_GENTLE, [0, 0], 0.005, 4000, method)  # 20 s, no torque
        d = np.asarray(impl.energy_drift(energy, np.asarray(Q), np.asarray(Qd)))
        assert d[0] == 0 and len(d) == 4001
        drift[method] = d
    assert np.abs(drift["rk4"]).max() < 1e-5, f"RK4 energy drift {np.abs(drift['rk4']).max():.1e} J"
    assert np.abs(drift["semi_implicit"]).max() < 0.1, "semi-implicit Euler: bounded energy error"
    assert drift["euler"][-1] > 1.0, "explicit Euler pumps energy in (it should gain > 1 J in 20 s)"
    assert np.abs(drift["euler"][2000:]).max() > np.abs(drift["euler"][:1000]).max(), "...and keeps growing"


@needs_mujoco
@pytest.mark.parametrize("integrator,method", [("RK4", "rk4"), ("Euler", "semi_implicit")])
def test_matches_mujoco_integrators(impl, f, integrator, method):
    import mujoco
    model = mujoco.MjModel.from_xml_string(planar2r_mjcf(P, timestep=0.001, integrator=integrator))
    Qm, Qdm = impl.simulate_mujoco(model, Q_WILD, [0, 0], 2000)
    Q, Qd = impl.simulate(f, Q_WILD, [0, 0], 0.001, 2000, method)
    err = np.abs(np.asarray(Q) - np.asarray(Qm)).max()
    assert err < 1e-9, (f"your {method} vs MuJoCo {integrator}: {err:.1e} rad apart after 2 s "
                        "(chaotic motion: any formula difference shows)")
    if method == "semi_implicit":
        Qe, _ = impl.simulate(f, Q_WILD, [0, 0], 0.001, 2000, "euler")
        assert np.abs(np.asarray(Qe) - np.asarray(Qm)).max() > 1e-3, \
            "MuJoCo's 'Euler' is semi-implicit: your explicit Euler should NOT match it"


@needs_mujoco
def test_rnea_arm_with_torques_matches_mujoco(impl):
    import mujoco
    from labs.manipulators.toolbox import gravity_rnea, rnea_model
    mdl = rnea_model(ARM3_DH, ARM3_LINKS)
    f3 = lambda q, qd, tau: impl.forward_dynamics(  # noqa: E731
        lambda x: mass_matrix_rnea(mdl, x), lambda x, v: bias_forces_rnea(mdl, x, v), q, qd, tau)
    tau_fn = lambda t, q, qd: gravity_rnea(mdl, q) + np.array([0.5, -1.0, 0.3]) * np.sin(5 * t)  # noqa: E731
    model = mujoco.MjModel.from_xml_string(dh_arm_mjcf(ARM3_DH, ARM3_LINKS, timestep=0.002))
    q0 = np.array([0.2, 0.5, -0.8])
    Qm, _ = impl.simulate_mujoco(model, q0, np.zeros(3), 250, tau_fn)
    Q, _ = impl.simulate(f3, q0, np.zeros(3), 0.002, 250, "rk4", tau_fn)
    Q, Qm = np.asarray(Q), np.asarray(Qm)
    assert np.abs(Q[-1] - q0).max() > 0.5, "(sanity) the torques really move the arm"
    np.testing.assert_allclose(Q, Qm, atol=1e-9,
                               err_msg="3-DOF arm: your RNEA + RK4 must match MuJoCo with qfrc_applied")
