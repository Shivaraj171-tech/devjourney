import numpy as np
import pytest

from labs.manipulators.toolbox import (
    ARM3_DH, UR5E_DH, body_screws, fk_dh, jacobian_body, planar2r_inverse_dynamics, screws_from_dh,
)
from labs.manipulators.toolbox.models import dh_arm_mjcf
from labs.manipulators.toolbox.robots import ARM3_LINKS, PLANAR2R_DYN as P, UR5E_LINKS
from labs.manipulators.toolbox.sim import mujoco_available

needs_mujoco = pytest.mark.skipif(not mujoco_available(), reason="optional: needs mujoco")
ARMS = [("ARM3", ARM3_DH, ARM3_LINKS), ("UR5e", UR5E_DH, UR5E_LINKS)]


def states(n, k=5, seed=0):
    rng = np.random.default_rng(seed)
    return [(rng.uniform(-3, 3, n), rng.uniform(-2, 2, n), rng.uniform(-5, 5, n)) for _ in range(k)]


def test_ad_and_spatial_inertia(impl, rng):
    V1, V2 = rng.normal(size=6), rng.normal(size=6)
    w1, v1, w2, v2 = V1[:3], V1[3:], V2[:3], V2[3:]
    bracket = np.concatenate([np.cross(w1, w2), np.cross(w1, v2) - np.cross(w2, v1)])
    np.testing.assert_allclose(impl.ad_twist(V1) @ V2, bracket, atol=1e-12,
                               err_msg="ad_V1 V2 = (w1 x w2, w1 x v2 - w2 x v1)")
    G = np.asarray(impl.spatial_inertia(2.0, [0.1, 0.2, 0.3]))
    np.testing.assert_allclose(G, np.diag([0.1, 0.2, 0.3, 2, 2, 2]), err_msg="(omega, v) order: I first")
    I = np.array([[0.1, 0.01, -0.02], [0.01, 0.2, 0.03], [-0.02, 0.03, 0.3]])
    G = np.asarray(impl.spatial_inertia(2.0, I))
    np.testing.assert_allclose(G[:3, :3], I, err_msg="a full 3x3 tensor goes in as it is (UR5e links)")
    np.testing.assert_allclose(G[3:, 3:], 2 * np.eye(3))
    np.testing.assert_allclose(G[:3, 3:], 0)


def test_com_frames(impl):
    homes = impl.com_frames(ARM3_DH, ARM3_LINKS)
    assert len(homes) == 4, "n COM frames + the end-effector frame"
    frames = [fk_dh(ARM3_DH[:i + 1], np.zeros(i + 1)) for i in range(3)]
    np.testing.assert_allclose(homes[1][:3, 3], [0.2, 0.0, 0.3], atol=1e-12,
                               err_msg="link 2 COM: half way along the upper arm at q = 0")
    np.testing.assert_allclose(homes[0][:3, :3], frames[0][:3, :3], err_msg="same orientation as DH frame i")
    np.testing.assert_allclose(homes[-1], frames[-1], err_msg="last entry: the end-effector frame")


@pytest.mark.parametrize("name,dh,links", ARMS)
def test_rnea_at_rest(impl, name, dh, links):
    model = impl.rnea_model(dh, links)
    assert len(model["Mlist"]) == len(dh) + 1 and len(model["Glist"]) == len(model["Alist"]) == len(dh)
    z = np.zeros(len(dh))
    np.testing.assert_allclose(impl.rnea(model, z, z, z, gravity=[0, 0, 0]), 0, atol=1e-12,
                               err_msg="no motion, no gravity: no torque")
    tau = impl.rnea(model, z, z, z)
    assert abs(tau[0]) < 1e-12, f"{name}: gravity cannot load the vertical base joint"
    assert np.abs(tau[1:]).max() > 0.1, f"{name}: gravity must load the shoulder"


def test_rnea_reproduces_lab18_closed_form(impl):
    dh2 = np.array([[P["l1"], 0, 0, 0], [P["l2"], 0, 0, 0.0]])
    links2 = ((P["m1"], (-(P["l1"] - P["lc1"]), 0, 0), (P["I1"] * 0.01, P["I1"], P["I1"])),
              (P["m2"], (-(P["l2"] - P["lc2"]), 0, 0), (P["I2"] * 0.01, P["I2"], P["I2"])))
    model = impl.rnea_model(dh2, links2)
    for q, qd, qdd in states(2, seed=3):
        np.testing.assert_allclose(impl.rnea(model, q, qd, qdd, gravity=[0, -P["g"], 0]),
                                   planar2r_inverse_dynamics(q, qd, qdd, P), atol=1e-10,
                                   err_msg="RNEA on the 2R arm (gravity along -y) must equal lab 18's "
                                           "M qdd + C qd + g")


@pytest.mark.parametrize("name,dh,links", ARMS)
def test_mass_matrix_and_bias(impl, name, dh, links):
    model = impl.rnea_model(dh, links)
    n = len(dh)
    for q, qd, qdd in states(n, 3, seed=5):
        M = np.asarray(impl.mass_matrix_rnea(model, q))
        np.testing.assert_allclose(M, M.T, atol=1e-10, err_msg=f"{name}: M symmetric")
        assert np.linalg.eigvalsh(M).min() > 0, f"{name}: M positive definite"
        np.testing.assert_allclose(M @ qdd + impl.bias_forces_rnea(model, q, qd), impl.rnea(model, q, qd, qdd),
                                   atol=1e-10, err_msg="tau = M qdd + bias")
        np.testing.assert_allclose(impl.gravity_rnea(model, q), impl.bias_forces_rnea(model, q, 0 * qd),
                                   atol=1e-12)
        # tau is affine in qdd, so a finite difference in qdd gives a column of M exactly
        e = np.eye(n)[0] * 1e-3
        np.testing.assert_allclose((impl.rnea(model, q, qd, qdd + e) - impl.rnea(model, q, qd, qdd)) / 1e-3,
                                   M[:, 0], atol=1e-8, err_msg="tau is linear in qdd with slope M")


@pytest.mark.parametrize("name,dh,links", ARMS)
def test_tip_wrench_maps_through_the_body_jacobian(impl, name, dh, links):
    model = impl.rnea_model(dh, links)
    M, S = screws_from_dh(dh)
    B = body_screws(M, S)
    rng = np.random.default_rng(1)
    q, qd, qdd = states(len(dh), 1, seed=8)[0]
    F = rng.normal(size=6)
    extra = impl.rnea(model, q, qd, qdd, F_tip=F) - impl.rnea(model, q, qd, qdd)
    np.testing.assert_allclose(extra, jacobian_body(B, q).T @ F, atol=1e-10,
                               err_msg=f"{name}: a tip wrench must add J_b^T F_tip")


@needs_mujoco
@pytest.mark.parametrize("name,dh,links", ARMS)
def test_matches_mj_inverse(impl, name, dh, links):
    import mujoco
    mj_model = mujoco.MjModel.from_xml_string(dh_arm_mjcf(dh, links))
    data = mujoco.MjData(mj_model)
    model = impl.rnea_model(dh, links)
    for q, qd, qdd in states(len(dh), 6, seed=11):
        ref = np.asarray(impl.mujoco_inverse(mj_model, data, q, qd, qdd))
        np.testing.assert_allclose(impl.rnea(model, q, qd, qdd), ref, atol=1e-9,
                                   err_msg=f"{name}: your RNEA != MuJoCo mj_inverse at q={np.round(q, 2)}")


@needs_mujoco
def test_mass_matrix_and_bias_match_mujoco(impl):
    import mujoco
    mj_model = mujoco.MjModel.from_xml_string(dh_arm_mjcf(UR5E_DH, UR5E_LINKS))
    data = mujoco.MjData(mj_model)
    model = impl.rnea_model(UR5E_DH, UR5E_LINKS)
    for q, qd, _ in states(6, 3, seed=12):
        data.qpos[:], data.qvel[:] = q, qd
        mujoco.mj_forward(mj_model, data)
        M = np.zeros((6, 6))
        mujoco.mj_fullM(mj_model, data, M)
        np.testing.assert_allclose(impl.mass_matrix_rnea(model, q), M, atol=1e-10, err_msg="M vs mj_fullM")
        np.testing.assert_allclose(impl.bias_forces_rnea(model, q, qd), data.qfrc_bias, atol=1e-10,
                                   err_msg="bias vs qfrc_bias")
