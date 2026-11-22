import numpy as np
import pytest

ATOL = 1e-9


def random_rotation(rng):
    q, r = np.linalg.qr(rng.normal(size=(3, 3)))
    q = q @ np.diag(np.sign(np.diag(r)))
    if np.linalg.det(q) < 0:
        q[:, 0] *= -1
    return q


@pytest.mark.parametrize("name,axis", [("rot_x", 0), ("rot_y", 1), ("rot_z", 2)])
def test_elementary_rotation_fixes_its_axis(impl, name, axis):
    R = getattr(impl, name)(0.7)
    e = np.eye(3)[axis]
    np.testing.assert_allclose(R @ e, e, atol=ATOL,
                               err_msg=f"{name} must leave its own axis unchanged")


def test_quarter_turns_follow_right_hand_rule(impl):
    x, y, z = np.eye(3)
    np.testing.assert_allclose(impl.rot_z(np.pi / 2) @ x, y, atol=ATOL,
                               err_msg="rot_z(+90deg) must send x to y")
    np.testing.assert_allclose(impl.rot_x(np.pi / 2) @ y, z, atol=ATOL,
                               err_msg="rot_x(+90deg) must send y to z")
    np.testing.assert_allclose(impl.rot_y(np.pi / 2) @ z, x, atol=ATOL,
                               err_msg="rot_y(+90deg) must send z to x (check the sin signs)")


@pytest.mark.parametrize("name", ["rot_x", "rot_y", "rot_z"])
def test_elementary_rotations_are_in_so3(impl, name, rng):
    for theta in rng.uniform(-np.pi, np.pi, size=5):
        R = np.asarray(getattr(impl, name)(theta))
        assert R.shape == (3, 3), f"{name} must return a 3x3 array, got shape {R.shape}"
        np.testing.assert_allclose(R.T @ R, np.eye(3), atol=1e-12,
                                   err_msg=f"{name}({theta:.3f}) is not orthonormal")
        assert abs(np.linalg.det(R) - 1) < 1e-12, f"det {name} must be +1"


def test_is_rotation_matrix_accepts_and_rejects(impl, rng):
    assert impl.is_rotation_matrix(random_rotation(rng)), "a random rotation must be accepted"
    assert impl.is_rotation_matrix(np.eye(3)), "the identity is a rotation"
    reflection = np.diag([1.0, 1.0, -1.0])
    assert not impl.is_rotation_matrix(reflection), "a mirror (det = -1) is not a rotation"
    assert not impl.is_rotation_matrix(2 * np.eye(3)), "a scaling is not a rotation"
    shear = np.eye(3)
    shear[0, 1] = 0.1
    assert not impl.is_rotation_matrix(shear), "a shear is not a rotation"
    assert not impl.is_rotation_matrix(np.eye(4)), "wrong shape must be rejected, not crash"


def test_project_to_so3_repairs_drift(impl, rng):
    R = random_rotation(rng)
    noisy = R + 1e-3 * rng.normal(size=(3, 3))
    P = np.asarray(impl.project_to_so3(noisy))
    np.testing.assert_allclose(P.T @ P, np.eye(3), atol=1e-10,
                               err_msg="projection result must be orthonormal")
    assert abs(np.linalg.det(P) - 1) < 1e-10, "projection must have det +1"
    assert np.linalg.norm(P - R) < 5e-3, "projection should stay close to the original rotation"


def test_project_to_so3_never_returns_a_mirror(impl):
    P = np.asarray(impl.project_to_so3(np.diag([1.0, 1.0, -1.0])))
    assert abs(np.linalg.det(P) - 1) < 1e-10, \
        "projecting a reflection must still give det +1 (flip the last singular direction)"


def test_skew_matches_cross_product(impl, rng):
    for _ in range(5):
        w, v = rng.normal(size=3), rng.normal(size=3)
        W = np.asarray(impl.skew(w))
        np.testing.assert_allclose(W @ v, np.cross(w, v), atol=1e-12,
                                   err_msg="skew(w) @ v must equal np.cross(w, v)")
        np.testing.assert_allclose(W.T, -W, atol=0, err_msg="skew(w) must be skew-symmetric")
        np.testing.assert_allclose(impl.vee(W), w, atol=1e-12, err_msg="vee(skew(w)) must give w")


def test_relative_rotation_subscript_rule(impl, rng):
    R_sa, R_ab = random_rotation(rng), random_rotation(rng)
    R_sb = R_sa @ R_ab
    np.testing.assert_allclose(impl.relative_rotation(R_sa, R_sb), R_ab, atol=1e-12,
                               err_msg="R_ab should equal R_sa^T @ R_sb")
