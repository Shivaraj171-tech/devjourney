import numpy as np
import pytest

from labs.manipulators.toolbox import exp_so3, log_so3, rot_x, rot_z


def rand_quat(rng):
    q = rng.normal(size=4)
    return q / np.linalg.norm(q)


def same_rotation(qa, qb, atol=1e-9):
    return np.allclose(qa, qb, atol=atol) or np.allclose(qa, -np.asarray(qb), atol=atol)


def test_normalize(impl):
    np.testing.assert_allclose(impl.quat_normalize([2, 0, 0, 0]), [1, 0, 0, 0])
    with pytest.raises(ValueError):
        impl.quat_normalize([0, 0, 0, 0])


def test_multiply_basis_units(impl):
    i, j, k = [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]
    np.testing.assert_allclose(impl.quat_multiply(i, j), k, atol=1e-15, err_msg="i*j must be k")
    np.testing.assert_allclose(impl.quat_multiply(j, i), np.negative(k), atol=1e-15,
                               err_msg="j*i must be -k (quaternions don't commute)")
    np.testing.assert_allclose(impl.quat_multiply(i, i), [-1, 0, 0, 0], atol=1e-15,
                               err_msg="i*i must be -1")


def test_axis_angle_half_angle(impl):
    q = impl.quat_from_axis_angle([0, 0, 2], np.pi / 2)
    np.testing.assert_allclose(q, [np.cos(np.pi / 4), 0, 0, np.sin(np.pi / 4)], atol=1e-12,
                               err_msg="q = (cos(theta/2), sin(theta/2) k), with k normalised")


def test_rotate_agrees_with_matrix(impl, rng):
    for _ in range(10):
        q, v = rand_quat(rng), rng.normal(size=3)
        R = np.asarray(impl.quat_to_matrix(q))
        np.testing.assert_allclose(impl.quat_rotate(q, v), R @ v, atol=1e-12,
                                   err_msg="quat_rotate(q, v) must equal quat_to_matrix(q) @ v")
        np.testing.assert_allclose(R.T @ R, np.eye(3), atol=1e-12)


def test_matrix_matches_rodrigues(impl):
    q = impl.quat_from_axis_angle([1, 0, 0], 0.4)
    np.testing.assert_allclose(impl.quat_to_matrix(q), rot_x(0.4), atol=1e-12)


def test_product_composes_rotations(impl, rng):
    q1, q2 = rand_quat(rng), rand_quat(rng)
    np.testing.assert_allclose(impl.quat_to_matrix(impl.quat_multiply(q1, q2)),
                               np.asarray(impl.quat_to_matrix(q1)) @ impl.quat_to_matrix(q2),
                               atol=1e-12, err_msg="R(q1*q2) must equal R(q1) @ R(q2)")


def test_double_cover(impl, rng):
    q = rand_quat(rng)
    np.testing.assert_allclose(impl.quat_to_matrix(q), impl.quat_to_matrix(-q), atol=1e-12,
                               err_msg="q and -q are the same rotation")


def test_matrix_to_quat_round_trip_including_half_turns(impl, rng):
    mats = [exp_so3(rng.normal(size=3)) for _ in range(30)]
    mats += [rot_z(np.pi), rot_x(np.pi), exp_so3(np.pi * np.array([1, 1, 0]) / np.sqrt(2))]
    for R in mats:
        q = np.asarray(impl.matrix_to_quat(R))
        assert q[0] >= -1e-12, "return the representative with w >= 0"
        np.testing.assert_allclose(np.linalg.norm(q), 1, atol=1e-12)
        np.testing.assert_allclose(impl.quat_to_matrix(q), R, atol=1e-9,
                                   err_msg="matrix_to_quat must invert quat_to_matrix (also at 180 deg)")


def test_slerp_endpoints_and_constant_speed(impl):
    q0 = np.array([1.0, 0, 0, 0])
    q1 = impl.quat_from_axis_angle([0, 1, 0], 2.0)
    np.testing.assert_allclose(impl.quat_slerp(q0, q1, 0.0), q0, atol=1e-12)
    assert same_rotation(impl.quat_slerp(q0, q1, 1.0), q1)
    for t in (0.25, 0.5, 0.8):
        q = np.asarray(impl.quat_slerp(q0, q1, t))
        np.testing.assert_allclose(np.linalg.norm(q), 1, atol=1e-12, err_msg="slerp must stay unit")
        angle = np.linalg.norm(log_so3(impl.quat_to_matrix(q)))
        assert abs(angle - 2.0 * t) < 1e-9, \
            f"slerp must move at constant angular speed: at t={t} expected {2*t:.3f} rad, got {angle:.3f}"


def test_slerp_takes_short_way(impl):
    q0 = np.array([1.0, 0, 0, 0])
    q1 = -np.asarray(impl.quat_from_axis_angle([0, 0, 1], 0.2))  # same rotation as +0.2 rad
    q = impl.quat_slerp(q0, q1, 0.5)
    angle = np.linalg.norm(log_so3(impl.quat_to_matrix(q)))
    assert abs(angle - 0.1) < 1e-9, \
        "q1 has a negative dot with q0: flip it, or slerp goes the long way (~180 deg) round"


def test_slerp_nearly_identical_inputs(impl):
    q0 = np.array([1.0, 0, 0, 0])
    q1 = impl.quat_from_axis_angle([1, 0, 0], 1e-10)
    q = np.asarray(impl.quat_slerp(q0, q1, 0.5))
    assert np.isfinite(q).all(), "sin(omega) ~ 0: fall back to normalised linear interpolation"


def test_agrees_with_mujoco_if_installed(impl, rng):
    mujoco = pytest.importorskip("mujoco", reason="optional: compare with MuJoCo's mju_mulQuat")
    q1, q2 = rand_quat(rng), rand_quat(rng)
    out = np.zeros(4)
    mujoco.mju_mulQuat(out, q1, q2)
    np.testing.assert_allclose(impl.quat_multiply(q1, q2), out, atol=1e-12,
                               err_msg="your product disagrees with MuJoCo's mju_mulQuat")
