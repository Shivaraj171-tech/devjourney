import numpy as np
import pytest

from labs.manipulators.toolbox import UR5_DH, is_transform, rot_x, rot_z


def T_from(R=np.eye(3), p=(0, 0, 0)):
    T = np.eye(4)
    T[:3, :3], T[:3, 3] = R, p
    return T


def independent_arm3_position(q):
    # geometry, written independently of anything you write
    q1, q2, q3 = q
    r = 0.40 * np.cos(q2) + 0.30 * np.cos(q2 + q3)
    return np.array([np.cos(q1) * r, np.sin(q1) * r,
                     0.30 + 0.40 * np.sin(q2) + 0.30 * np.sin(q2 + q3)])


def test_dh_transform_is_product_of_four_moves(impl, rng):
    for _ in range(5):
        a, alpha, d, theta = rng.normal(size=4)
        expected = (T_from(rot_z(theta)) @ T_from(p=(0, 0, d)) @ T_from(p=(a, 0, 0))
                    @ T_from(rot_x(alpha)))
        np.testing.assert_allclose(impl.dh_transform(a, alpha, d, theta), expected, atol=1e-12,
                                   err_msg="dh_transform must equal Rz(theta) Tz(d) Tx(a) Rx(alpha)")


def test_fk_frames_shape_and_validity(impl, rng):
    q = rng.uniform(-np.pi, np.pi, size=6)
    frames = impl.fk_dh_frames(UR5_DH, q)
    assert len(frames) == 7, "expect n+1 frames including the base (identity)"
    np.testing.assert_allclose(frames[0], np.eye(4))
    for T in frames:
        assert is_transform(T), "every frame must be a valid SE(3) matrix"
    np.testing.assert_allclose(impl.fk_dh(UR5_DH, q), frames[-1], atol=1e-12)
    with pytest.raises(ValueError):
        impl.fk_dh_frames(UR5_DH, q[:5])


def test_arm3_table_filled_in(impl):
    dh = impl.ARM3_DH
    assert dh is not None, "TODO: fill in ARM3_DH in starter.py"
    assert np.asarray(dh).shape == (3, 4), "ARM3_DH needs 3 rows of [a, alpha, d, offset]"


def test_arm3_fk_matches_geometry(impl, rng):
    assert impl.ARM3_DH is not None, "TODO: fill in ARM3_DH in starter.py"
    for _ in range(20):
        q = rng.uniform(-np.pi, np.pi, size=3)
        p = np.asarray(impl.fk_dh(impl.ARM3_DH, q))[:3, 3]
        np.testing.assert_allclose(p, independent_arm3_position(q), atol=1e-9,
                                   err_msg=f"ARM3 end-effector position wrong at q={np.round(q, 3)}; "
                                           "check alpha_1 (the shoulder axis is horizontal)")


def test_arm3_closed_form(impl, rng):
    for _ in range(20):
        q = rng.uniform(-np.pi, np.pi, size=3)
        np.testing.assert_allclose(impl.arm3_position(q), independent_arm3_position(q), atol=1e-12)


def test_ur5_home_pose(impl):
    # At q = 0 the UR5 lies stretched out along -x. Reading the DH table by hand:
    # x = a2 + a3, y = -(d4 + d6), z = d1 - d5, and the tool z axis points along -y.
    T = np.asarray(impl.fk_dh(UR5_DH, np.zeros(6)))
    np.testing.assert_allclose(T[:3, 3], [-0.81725, -0.19145, -0.005491], atol=1e-9,
                               err_msg="UR5 tool position at q = 0")
    np.testing.assert_allclose(T[:3, 2], [0, -1, 0], atol=1e-12,
                               err_msg="UR5 tool z axis at q = 0")


def test_ur5_base_joint_spins_about_world_z(impl, rng):
    q = rng.uniform(-np.pi, np.pi, size=6)
    T0 = np.asarray(impl.fk_dh(UR5_DH, q))
    q2 = q.copy()
    q2[0] += 0.5
    T1 = np.asarray(impl.fk_dh(UR5_DH, q2))
    np.testing.assert_allclose(T1, T_from(rot_z(0.5)) @ T0, atol=1e-12,
                               err_msg="turning joint 1 must rotate the whole arm about base z")
