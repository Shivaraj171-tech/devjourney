import numpy as np

from labs.manipulators.toolbox import ARM3_DH, UR5E_DH, exp_so3, fk_dh, skew


def series_expm(A, terms=40):
    out, term = np.eye(4), np.eye(4)
    for n in range(1, terms):
        term = term @ A / n
        out = out + term
    return out


def rand_T(rng):
    T = np.eye(4)
    T[:3, :3] = exp_so3(rng.normal(size=3))
    T[:3, 3] = rng.normal(size=3)
    return T


def test_twist_matrix_round_trip(impl, rng):
    S = rng.normal(size=6)
    M = np.asarray(impl.twist_to_matrix(S))
    assert M.shape == (4, 4)
    np.testing.assert_allclose(M[:3, :3], skew(S[:3]), err_msg="top-left block is [omega]")
    np.testing.assert_allclose(M[:3, 3], S[3:], err_msg="top-right column is v")
    np.testing.assert_allclose(M[3], 0, err_msg="bottom row of an se(3) matrix is all zeros")
    np.testing.assert_allclose(impl.matrix_to_twist(M), S)


def test_adjoint_identity(impl, rng):
    T, S = rand_T(rng), rng.normal(size=6)
    lhs = np.asarray(impl.twist_to_matrix(np.asarray(impl.adjoint(T)) @ S))
    rhs = T @ impl.twist_to_matrix(S) @ np.linalg.inv(T)
    np.testing.assert_allclose(lhs, rhs, atol=1e-12,
                               err_msg="[Ad_T S] must equal T [S] T^-1 (lower-left block is [p] R)")


def test_exp_se3_matches_series(impl, rng):
    for _ in range(5):
        S, th = rng.normal(size=6), rng.uniform(-2, 2)
        np.testing.assert_allclose(impl.exp_se3(S, th), series_expm(impl.twist_to_matrix(S) * th),
                                   atol=1e-9, err_msg="exp_se3 must equal the matrix power series "
                                                      "(non-unit omega: rescale!)")


def test_exp_se3_pure_translation(impl):
    T = np.asarray(impl.exp_se3([0, 0, 0, 1, 2, 3], 0.5))
    np.testing.assert_allclose(T[:3, :3], np.eye(3))
    np.testing.assert_allclose(T[:3, 3], [0.5, 1.0, 1.5], err_msg="omega = 0: translate by v*theta")


def test_log_inverts_exp(impl, rng):
    for _ in range(20):
        T = rand_T(rng)
        T[:3, :3] = exp_so3(rng.normal(size=3) * 0.8)
        np.testing.assert_allclose(impl.exp_se3(impl.log_se3(T), 1.0), T, atol=1e-9,
                                   err_msg="exp(log(T)) must give back T")
    T = np.eye(4)
    T[:3, 3] = [0.1, 0.2, 0.3]
    np.testing.assert_allclose(impl.log_se3(T), [0, 0, 0, 0.1, 0.2, 0.3], atol=1e-12,
                               err_msg="log of a pure translation is (0, p)")


def test_revolute_screw_moves_points_correctly(impl):
    # joint about +z through (1, 0, 0): a point at (2, 0, 0) turned 90deg goes to (1, 1, 0)
    S = impl.revolute_screw([0, 0, 1], [1, 0, 0])
    np.testing.assert_allclose(S, [0, 0, 1, 0, -1, 0], atol=1e-12, err_msg="S = (w, -w x q)")
    T = impl.exp_se3(S, np.pi / 2)
    np.testing.assert_allclose((T @ [2, 0, 0, 1])[:3], [1, 1, 0], atol=1e-12)


def test_poe_equals_dh_on_ur5e(impl, rng):
    M, Slist = impl.screws_from_dh(UR5E_DH)
    assert np.asarray(Slist).shape == (6, 6), "Slist must be 6 x n (one screw per column)"
    np.testing.assert_allclose(Slist[:, 0], [0, 0, 1, 0, 0, 0], atol=1e-12,
                               err_msg="UR5e joint 1 spins about base z through the origin")
    np.testing.assert_allclose(Slist[:, 1], [0, -1, 0, 0.1625, 0, 0], atol=1e-12,
                               err_msg="UR5e joint 2: axis -y through (0, 0, d1)")
    for _ in range(30):
        q = rng.uniform(-np.pi, np.pi, size=6)
        np.testing.assert_allclose(impl.fk_space(M, Slist, q), fk_dh(UR5E_DH, q), atol=1e-9,
                                   err_msg=f"PoE != DH on the UR5e at q = {np.round(q, 3)}")


def test_poe_equals_dh_on_arm3(impl, rng):
    M, Slist = impl.screws_from_dh(ARM3_DH)
    for _ in range(10):
        q = rng.uniform(-np.pi, np.pi, size=3)
        np.testing.assert_allclose(impl.fk_space(M, Slist, q), fk_dh(ARM3_DH, q), atol=1e-9)


def test_body_form_agrees(impl, rng):
    M, Slist = impl.screws_from_dh(UR5E_DH)
    Blist = impl.body_screws(M, Slist)
    for _ in range(10):
        q = rng.uniform(-np.pi, np.pi, size=6)
        np.testing.assert_allclose(impl.fk_body(M, Blist, q), impl.fk_space(M, Slist, q),
                                   atol=1e-9, err_msg="M e^[B]q ... must equal e^[S]q ... M")
