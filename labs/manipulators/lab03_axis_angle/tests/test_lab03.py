import numpy as np
import pytest

from labs.manipulators.toolbox import rot_x, rot_z


def series_exp(A, terms=40):
    out, term = np.eye(3), np.eye(3)
    for n in range(1, terms):
        term = term @ A / n
        out = out + term
    return out


def test_rodrigues_matches_elementary_rotation(impl):
    np.testing.assert_allclose(impl.rodrigues([0, 0, 1], 0.7), rot_z(0.7), atol=1e-12,
                               err_msg="rodrigues about z must equal rot_z")
    np.testing.assert_allclose(impl.rodrigues([2, 0, 0], -1.2), rot_x(-1.2), atol=1e-12,
                               err_msg="rodrigues must normalise a non-unit axis")


def test_rodrigues_rejects_zero_axis(impl):
    with pytest.raises(ValueError):
        impl.rodrigues([0, 0, 0], 1.0)


def test_exp_so3_equals_power_series(impl, rng):
    from labs.manipulators.toolbox import skew
    for _ in range(5):
        w = rng.normal(size=3)
        np.testing.assert_allclose(impl.exp_so3(w), series_exp(skew(w)), atol=1e-10,
                                   err_msg="exp_so3(w) must equal the series I + [w] + [w]^2/2! + ...")


def test_exp_so3_small_and_zero(impl):
    np.testing.assert_allclose(impl.exp_so3(np.zeros(3)), np.eye(3), atol=1e-15,
                               err_msg="exp of zero must be the identity (and must not divide by 0)")
    w = np.array([1e-12, -2e-12, 3e-12])
    R = impl.exp_so3(w)
    assert np.isfinite(R).all(), "tiny rotation vectors must not produce NaN"


def test_log_inverts_exp_generic(impl, rng):
    for _ in range(50):
        axis = rng.normal(size=3)
        axis /= np.linalg.norm(axis)
        theta = rng.uniform(1e-3, np.pi - 1e-3)
        w = impl.log_so3(impl.exp_so3(axis * theta))
        np.testing.assert_allclose(w, axis * theta, atol=1e-8,
                                   err_msg=f"log(exp(w)) != w for |w| = {theta:.3f}")


def test_log_near_identity(impl):
    w = np.array([1e-9, 2e-9, -1e-9])
    np.testing.assert_allclose(impl.log_so3(impl.exp_so3(w)), w, atol=1e-14,
                               err_msg="log near the identity: use R ~ I + [w], not theta/(2 sin theta)")


@pytest.mark.parametrize("axis", [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, -2, 3]])
def test_log_at_half_turn(impl, axis):
    axis = np.asarray(axis, float) / np.linalg.norm(axis)
    R = impl.rodrigues(axis, np.pi)
    w = np.asarray(impl.log_so3(R))
    assert np.isfinite(w).all(), "theta = pi: sin(theta) = 0, you need the special branch"
    assert abs(np.linalg.norm(w) - np.pi) < 1e-6, "angle must be pi"
    assert abs(abs(w @ axis) - np.pi) < 1e-6, "axis must be +-k (both are valid at pi)"
    np.testing.assert_allclose(impl.exp_so3(w), R, atol=1e-8)


def test_axis_angle_from_matrix(impl):
    k, th = impl.axis_angle_from_matrix(rot_z(-0.5))
    np.testing.assert_allclose(k, [0, 0, -1], atol=1e-12,
                               err_msg="angle is kept in [0, pi], so the axis flips to -z")
    assert abs(th - 0.5) < 1e-12
    k, th = impl.axis_angle_from_matrix(np.eye(3))
    assert th == pytest.approx(0.0) and np.linalg.norm(k) == pytest.approx(1.0)
