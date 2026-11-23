import numpy as np
import pytest

from labs.manipulators.toolbox.models import planar2r_mjcf
from labs.manipulators.toolbox.robots import PLANAR2R_DYN as P
from labs.manipulators.toolbox.sim import mujoco_available

needs_mujoco = pytest.mark.skipif(not mujoco_available(), reason="optional: needs mujoco")
H = 1e-6


def states(n=6, seed=4):
    rng = np.random.default_rng(seed)
    return [(rng.uniform(-np.pi, np.pi, 2), rng.uniform(-3, 3, 2), rng.uniform(-5, 5, 2))
            for _ in range(n)]


def test_com_positions_and_jacobians(impl):
    c1, c2 = (np.asarray(c) for c in impl.com_positions([0.0, np.pi / 2], P))
    np.testing.assert_allclose(c1, [0.5, 0.0], atol=1e-12, err_msg="link 1 COM at lc1 along x")
    np.testing.assert_allclose(c2, [1.0, 0.4], atol=1e-12, err_msg="link 2 points up when q2 = pi/2")
    for q, _, _ in states(3):
        J1, J2 = (np.asarray(J) for J in impl.com_jacobians(q, P))
        for i, J in ((0, J1), (1, J2)):
            num = np.column_stack([(np.asarray(impl.com_positions(q + e, P)[i])
                                    - np.asarray(impl.com_positions(q - e, P)[i])) / (2 * H)
                                   for e in np.eye(2) * H])
            np.testing.assert_allclose(J, num, atol=1e-7, err_msg=f"Jv{i + 1} must be d(c{i + 1})/dq")


def test_mass_matrix(impl):
    for q, _, _ in states():
        M = np.asarray(impl.planar2r_mass_matrix(q, P))
        np.testing.assert_allclose(M, M.T, err_msg="M is symmetric")
        assert np.all(np.linalg.eigvalsh(M) > 0), "M is positive definite"
        np.testing.assert_allclose(M, impl.mass_matrix_from_jacobians(q, P), atol=1e-12,
                                   err_msg="closed form != sum m Jv^T Jv + I Jw^T Jw (recheck step 3)")
    M0 = np.asarray(impl.planar2r_mass_matrix([0.3, 0.0], P))
    M1 = np.asarray(impl.planar2r_mass_matrix([1.7, 0.0], P))
    np.testing.assert_allclose(M0, M1, err_msg="M depends on q2 only")


def test_gravity_is_gradient_of_potential(impl):
    for q, _, _ in states():
        num = [(impl.planar2r_energy(q + e, [0, 0], P)[1] - impl.planar2r_energy(q - e, [0, 0], P)[1])
               / (2 * H) for e in np.eye(2) * H]
        np.testing.assert_allclose(impl.planar2r_gravity(q, P), num, atol=1e-6,
                                   err_msg="g(q) must equal dP/dq")
    assert impl.planar2r_energy([np.pi / 2, 0], [0, 0], P)[1] == pytest.approx(
        9.81 * (1.0 * 0.5 + 0.8 * 1.4)), "P = g (m1 z_c1 + m2 z_c2): arm pointing straight up"


def test_coriolis_matches_lagrange(impl):
    for q, qd, _ in states():
        M = lambda x: np.asarray(impl.planar2r_mass_matrix(x, P))  # noqa: E731
        dM = [(M(q + e) - M(q - e)) / (2 * H) for e in np.eye(2) * H]
        Mdot = dM[0] * qd[0] + dM[1] * qd[1]
        grad = np.array([0.5 * qd @ dMi @ qd for dMi in dM])
        np.testing.assert_allclose(np.asarray(impl.planar2r_coriolis_matrix(q, qd, P)) @ qd,
                                   Mdot @ qd - grad, atol=1e-6,
                                   err_msg="C qd must equal Mdot qd - 1/2 d(qd^T M qd)/dq (step 5)")


def test_mdot_minus_2c_is_skew(impl):
    for q, qd, _ in states():
        M = lambda x: np.asarray(impl.planar2r_mass_matrix(x, P))  # noqa: E731
        Mdot = sum((M(q + e) - M(q - e)) / (2 * H) * qd[i] for i, e in enumerate(np.eye(2) * H))
        N = Mdot - 2 * np.asarray(impl.planar2r_coriolis_matrix(q, qd, P))
        np.testing.assert_allclose(N, -N.T, atol=1e-6,
                                   err_msg="Mdot - 2C must be skew-symmetric for the Christoffel C")


def test_inverse_dynamics_and_power(impl):
    for q, qd, qdd in states():
        tau = impl.planar2r_inverse_dynamics(q, qd, qdd, P)
        M = impl.planar2r_mass_matrix(q, P)
        np.testing.assert_allclose(tau, M @ qdd + impl.planar2r_coriolis_matrix(q, qd, P) @ qd
                                   + impl.planar2r_gravity(q, P), atol=1e-12)
        # energy balance along the motion: dE/dt = qd . tau  (finite difference in time)
        dt = 1e-6
        E = lambda x, v: sum(impl.planar2r_energy(x, v, P))  # noqa: E731
        dE = (E(q + qd * dt + 0.5 * qdd * dt**2, qd + qdd * dt)
              - E(q - qd * dt + 0.5 * qdd * dt**2, qd - qdd * dt)) / (2 * dt)
        assert dE == pytest.approx(qd @ tau, rel=1e-5, abs=1e-5), "power balance dE/dt = qd^T tau"


@needs_mujoco
def test_mass_matrix_and_bias_match_mujoco(impl):
    import mujoco
    model = mujoco.MjModel.from_xml_string(planar2r_mjcf(P))
    data = mujoco.MjData(model)
    for q, qd, _ in states(8, seed=9):
        M_mj, bias = (np.asarray(x) for x in impl.mujoco_dynamics(model, data, q, qd))
        assert M_mj.shape == (2, 2), "dense nv x nv mass matrix from mj_fullM"
        np.testing.assert_allclose(impl.planar2r_mass_matrix(q, P), M_mj, atol=1e-10,
                                   err_msg="your M(q) != MuJoCo's mj_fullM")
        np.testing.assert_allclose(impl.planar2r_coriolis_matrix(q, qd, P) @ qd + impl.planar2r_gravity(q, P),
                                   bias, atol=1e-10, err_msg="your C qd + g != MuJoCo's qfrc_bias")
    bias_before = bias.copy()
    impl.mujoco_dynamics(model, data, [0.1, 0.2], [0.0, 0.0])
    np.testing.assert_allclose(bias, bias_before, err_msg="return a COPY of data.qfrc_bias")


@needs_mujoco
def test_energy_matches_mujoco(impl):
    import mujoco
    model = mujoco.MjModel.from_xml_string(planar2r_mjcf(P))
    data = mujoco.MjData(model)
    for q, qd, _ in states(4, seed=2):
        data.qpos[:], data.qvel[:] = q, qd
        mujoco.mj_forward(model, data)  # <flag energy="enable"/> fills data.energy = [P, K]
        K, Pot = impl.planar2r_energy(q, qd, P)
        assert (Pot, K) == pytest.approx(tuple(data.energy), abs=1e-10)
