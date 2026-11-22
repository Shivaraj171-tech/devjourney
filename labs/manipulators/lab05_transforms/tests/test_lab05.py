import numpy as np

from labs.manipulators.toolbox import exp_so3, rot_z


def rand_T(rng):
    T = np.eye(4)
    T[:3, :3] = exp_so3(rng.normal(size=3))
    T[:3, 3] = rng.normal(size=3)
    return T


def test_make_and_split(impl):
    R, p = rot_z(0.3), np.array([1.0, 2.0, 3.0])
    T = np.asarray(impl.make_transform(R, p))
    assert T.shape == (4, 4)
    np.testing.assert_allclose(T[3], [0, 0, 0, 1], err_msg="bottom row must be [0, 0, 0, 1]")
    R2, p2 = impl.split_transform(T)
    np.testing.assert_allclose(R2, R)
    np.testing.assert_allclose(p2, p)
    R2[0, 0] = 99.0
    assert T[0, 0] != 99.0, "split_transform should return copies, not views into T"


def test_is_transform(impl, rng):
    T = rand_T(rng)
    assert impl.is_transform(T)
    bad = T.copy()
    bad[3, 0] = 0.1
    assert not impl.is_transform(bad), "bottom row must be exactly [0, 0, 0, 1]"
    bad = T.copy()
    bad[:3, :3] *= 2
    assert not impl.is_transform(bad), "rotation block must be in SO(3)"


def test_inverse_closed_form(impl, rng):
    for _ in range(10):
        T = rand_T(rng)
        Ti = np.asarray(impl.transform_inverse(T))
        np.testing.assert_allclose(Ti @ T, np.eye(4), atol=1e-12,
                                   err_msg="T^-1 @ T must be identity")
        np.testing.assert_allclose(Ti[3], [0, 0, 0, 1], atol=0)


def test_inverse_does_not_use_linalg_inv(impl, rng, monkeypatch):
    def forbidden(*a, **k):
        raise AssertionError("use the closed form [[R^T, -R^T p], [0, 1]], not np.linalg.inv")
    monkeypatch.setattr(np.linalg, "inv", forbidden)
    impl.transform_inverse(rand_T(rng))


def test_transform_points_single_and_batch(impl, rng):
    T = rand_T(rng)
    pts = rng.normal(size=(7, 3))
    out = np.asarray(impl.transform_points(T, pts))
    assert out.shape == (7, 3), "a (N, 3) input must give a (N, 3) output"
    expected = (T @ np.c_[pts, np.ones(7)].T).T[:, :3]
    np.testing.assert_allclose(out, expected, atol=1e-12)
    np.testing.assert_allclose(impl.transform_points(T, pts[0]), expected[0], atol=1e-12,
                               err_msg="a single (3,) point must also work")


def test_chain_and_relative_transform(impl, rng):
    T01, T12, T23 = rand_T(rng), rand_T(rng), rand_T(rng)
    np.testing.assert_allclose(impl.chain(T01, T12, T23), T01 @ T12 @ T23, atol=1e-12,
                               err_msg="chain must multiply left to right")
    np.testing.assert_allclose(impl.chain(), np.eye(4), err_msg="empty chain = identity")
    T_wa, T_wb = rand_T(rng), rand_T(rng)
    T_ab = np.asarray(impl.relative_transform(T_wa, T_wb))
    np.testing.assert_allclose(T_wa @ T_ab, T_wb, atol=1e-12,
                               err_msg="T_wa @ T_ab must equal T_wb")


def test_camera_on_gripper_story(impl):
    # world -> base (robot bolted 1 m along x), base -> gripper, gripper -> camera
    T_wb = impl.make_transform(rot_z(np.pi / 2), [1.0, 0, 0])
    T_bg = impl.make_transform(np.eye(3), [0.5, 0, 0.4])
    T_gc = impl.make_transform(np.eye(3), [0, 0, 0.1])
    T_wc = impl.chain(T_wb, T_bg, T_gc)
    # camera sees a cube 0.3 m straight ahead along its own z axis
    cube_w = impl.transform_points(T_wc, [0, 0, 0.3])
    np.testing.assert_allclose(cube_w, [1.0, 0.5, 0.8], atol=1e-12,
                               err_msg="base is turned 90deg about z, so the gripper's +x points "
                                       "along world +y")
