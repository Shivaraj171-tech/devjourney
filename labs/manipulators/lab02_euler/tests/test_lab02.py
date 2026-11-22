import numpy as np
import pytest

from labs.manipulators.toolbox import rot_x, rot_y, rot_z, skew, vee


def test_composition_order_is_zyx(impl):
    R = impl.euler_zyx_to_matrix(0.3, -0.4, 0.5)
    np.testing.assert_allclose(R, rot_z(0.3) @ rot_y(-0.4) @ rot_x(0.5), atol=1e-12,
                               err_msg="expected Rz(yaw) @ Ry(pitch) @ Rx(roll), in that order")


def test_round_trip_away_from_gimbal_lock(impl, rng):
    for _ in range(50):
        yaw, roll = rng.uniform(-np.pi, np.pi, size=2)
        pitch = rng.uniform(-1.5, 1.5)
        R = impl.euler_zyx_to_matrix(yaw, pitch, roll)
        got = np.array(impl.matrix_to_euler_zyx(R), dtype=float)
        np.testing.assert_allclose(got, [yaw, pitch, roll], atol=1e-9,
                                   err_msg=f"round trip failed for {(yaw, pitch, roll)}")


@pytest.mark.parametrize("pitch", [np.pi / 2, -np.pi / 2])
def test_gimbal_lock_branch_reproduces_matrix(impl, pitch):
    R = impl.euler_zyx_to_matrix(0.8, pitch, -0.3)
    yaw, p, roll = impl.matrix_to_euler_zyx(R)
    assert np.isfinite([yaw, p, roll]).all(), "angles must be finite at gimbal lock"
    assert abs(roll) < 1e-12, "convention at gimbal lock: roll = 0"
    np.testing.assert_allclose(impl.euler_zyx_to_matrix(yaw, p, roll), R, atol=1e-9,
                               err_msg="at gimbal lock the angles need not match, but the matrix must")


def test_is_gimbal_locked(impl):
    assert impl.is_gimbal_locked(np.pi / 2)
    assert impl.is_gimbal_locked(-np.pi / 2)
    assert not impl.is_gimbal_locked(0.0)
    assert not impl.is_gimbal_locked(1.5)


def test_gimbal_lock_demo_shows_lost_dof(impl):
    R1, R2 = impl.gimbal_lock_demo(np.pi / 2, 0.3)
    np.testing.assert_allclose(R1, R2, atol=1e-12,
                               err_msg="at pitch=+90deg, adding the same angle to yaw and roll "
                                       "should give the same orientation")
    R1, R2 = impl.gimbal_lock_demo(0.2, 0.3)
    assert np.linalg.norm(np.asarray(R1) - np.asarray(R2)) > 1e-2, \
        "away from gimbal lock the two orientations must differ"


def test_euler_rate_matrix_matches_finite_difference(impl, rng):
    angles = np.array([0.4, -0.6, 1.1])
    rates = rng.normal(size=3)
    h = 1e-6
    R = lambda a: rot_z(a[0]) @ rot_y(a[1]) @ rot_x(a[2])
    Rdot = (R(angles + h * rates) - R(angles - h * rates)) / (2 * h)
    w_s = vee(Rdot @ R(angles).T)  # [w_s] = Rdot R^T
    E = np.asarray(impl.euler_rate_matrix(*angles))
    np.testing.assert_allclose(E @ rates, w_s, atol=1e-7,
                               err_msg="E @ rates must equal the space angular velocity vee(Rdot R^T)")


def test_euler_rate_matrix_loses_rank_at_gimbal_lock(impl):
    s_ok = np.linalg.svd(impl.euler_rate_matrix(0.3, 0.2, 0.1), compute_uv=False)
    s_lock = np.linalg.svd(impl.euler_rate_matrix(0.3, np.pi / 2, 0.1), compute_uv=False)
    assert s_ok.min() > 0.1, "E should be well conditioned at pitch = 0.2"
    assert s_lock.min() < 1e-9, \
        "E must become singular at pitch = 90deg: two columns become parallel (that IS gimbal lock)"
