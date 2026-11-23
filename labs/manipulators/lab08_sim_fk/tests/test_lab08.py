import numpy as np
import pytest

mujoco = pytest.importorskip(
    "mujoco", reason="lab08 needs MuJoCo: pip install -r labs/manipulators/requirements.txt")

from labs.manipulators.toolbox import ARM3_DH, UR5E_DH, fk_dh, rot_x  # noqa: E402


def test_link_constant(impl):
    T = np.asarray(impl.link_constant(0.2, 0.5, 0.3))
    expected = np.eye(4)
    expected[:3, :3] = rot_x(0.5)
    expected[:3, 3] = [0.2, 0, 0.3]
    np.testing.assert_allclose(T, expected, atol=1e-12, err_msg="Tz(d) Tx(a) Rx(alpha)")


def test_mjcf_compiles_with_expected_structure(impl):
    xml = impl.dh_to_mjcf(UR5E_DH, "ur5e")
    model = mujoco.MjModel.from_xml_string(xml)
    assert model.nq == 6 and model.njnt == 6, "one hinge joint per DH row"
    for i in range(6):
        j = model.joint(f"j{i + 1}")
        assert j.type[0] == mujoco.mjtJoint.mjJNT_HINGE, f"j{i + 1} must be a hinge"
        np.testing.assert_allclose(j.axis, [0, 0, 1], err_msg="DH joints spin about local z")
    assert model.site("ee") is not None


def test_load_model_and_site_pose_at_home(impl):
    model, data = impl.load_model(impl.dh_to_mjcf(UR5E_DH))
    T = np.asarray(impl.sim_site_pose(model, data, np.zeros(6)))
    assert T.shape == (4, 4)
    np.testing.assert_allclose(T[:3, 3], [-0.8172, -0.2329, 0.0628], atol=1e-9,
                               err_msg="sim end effector at q = 0 should match the DH home pose")


@pytest.mark.parametrize("name,dh", [("UR5e", UR5E_DH), ("ARM3", ARM3_DH)])
def test_sim_matches_fk_at_random_configs(impl, name, dh):
    model, data = impl.load_model(impl.dh_to_mjcf(dh))
    rng = np.random.default_rng(7)
    for _ in range(40):
        q = rng.uniform(-np.pi, np.pi, size=len(dh))
        T_sim = np.asarray(impl.sim_site_pose(model, data, q))
        T_fk = fk_dh(dh, q)
        np.testing.assert_allclose(T_sim, T_fk, atol=1e-9,
                                   err_msg=f"{name}: MuJoCo and DH FK disagree at q={np.round(q, 3)}. "
                                           "If only q=0 works, check where Rz(offset) and the joint go; "
                                           "if angles look 57x off, something is in degrees")


def test_offsets_are_handled(impl):
    dh = UR5E_DH.copy()
    dh[:, 3] = [0.1, -0.5, 0.3, 0.0, 0.2, 1.0]
    model, data = impl.load_model(impl.dh_to_mjcf(dh))
    q = np.array([0.3, -0.2, 0.5, 1.0, -0.7, 0.4])
    np.testing.assert_allclose(impl.sim_site_pose(model, data, q), fk_dh(dh, q), atol=1e-9,
                               err_msg="non-zero theta offsets: body i must include Rz(offset_i)")


def test_pose_error_and_compare(impl):
    T = np.eye(4)
    T2 = np.eye(4)
    T2[:3, :3] = rot_x(0.3)
    T2[:3, 3] = [0.3, 0.4, 0]
    dp, dr = impl.pose_error(T, T2)
    assert dp == pytest.approx(0.5) and dr == pytest.approx(0.3)
    worst_p, worst_r = impl.compare_with_sim(UR5E_DH, n_samples=20, seed=1)
    assert worst_p < 1e-9 and worst_r < 1e-9, "your model should agree with FK to round-off"


def test_model_can_be_simulated(impl):
    model, data = impl.load_model(impl.dh_to_mjcf(UR5E_DH))
    data.qpos[:] = 0.3
    for _ in range(50):
        mujoco.mj_step(model, data)
    assert np.isfinite(data.qpos).all(), "stepping the physics should work (bodies need mass)"
    assert not np.allclose(data.qpos, 0.3), "under gravity, an unactuated arm should move"
