import numpy as np
import pytest

from labs.manipulators.toolbox import (
    ARM3_DH, UR5_DH, body_screws, exp_se3, fk_body, fk_dh, geometric_jacobian, jacobian_body,
    screws_from_dh,
)

M, S = screws_from_dh(UR5_DH)
B = body_screws(M, S)
Q_TRUE = np.array([0.3, -1.1, 1.4, -1.8, -1.4, 0.5])
T_GOAL = fk_body(M, B, Q_TRUE)


def wrap(q):
    return np.mod(np.asarray(q) + np.pi, 2 * np.pi) - np.pi


def test_body_twist_error(impl):
    assert np.allclose(impl.body_twist_error(T_GOAL, T_GOAL), 0, atol=1e-12), "zero at the goal"
    T = fk_body(M, B, Q_TRUE + 0.3)
    V = np.asarray(impl.body_twist_error(T, T_GOAL))
    assert V.shape == (6,)
    np.testing.assert_allclose(T @ exp_se3(V, 1.0), T_GOAL, atol=1e-10,
                               err_msg="following V_b from T for unit time must land on T_sd: "
                                       "V_b = log(T_sb^-1 T_sd) (order matters)")


def test_error_norms(impl):
    w, v = impl.error_norms([0, 3, 4, 0, 0, 2])
    assert (w, v) == pytest.approx((5.0, 2.0)), "(|omega|, |v|): angular part first"


def test_newton_step(impl, rng):
    J = rng.normal(size=(6, 6))
    e = rng.normal(size=6)
    np.testing.assert_allclose(impl.newton_step(J, e), np.linalg.solve(J, e), atol=1e-10)
    Js = np.diag([1.0, 2.0, 0.0])
    np.testing.assert_allclose(impl.newton_step(Js, [1.0, 1.0, 1.0]), [1.0, 0.5, 0.0], atol=1e-12,
                               err_msg="singular J: least squares, minimum norm (no inf / nan)")


def test_converges_quadratically_from_a_nearby_guess(impl):
    q, ok, hist = impl.ik_newton(M, B, T_GOAL, Q_TRUE + 0.2)
    assert ok, "from 0.2 rad away Newton must converge"
    hist = np.asarray(hist)
    assert hist.shape[1] == 2, "history entries are (|omega|, |v|)"
    assert len(hist) <= 7, f"took {len(hist) - 1} iterations; Newton needs ~4 from this close"
    np.testing.assert_allclose(fk_body(M, B, q), T_GOAL, atol=1e-8)
    np.testing.assert_allclose(wrap(q - Q_TRUE), 0, atol=1e-7, err_msg="nearby seed -> same solution")
    e = hist.sum(axis=1)
    e = e[e > 1e-12]
    order = np.asarray(impl.convergence_order(e))
    assert order[-1] > 1.7, f"last convergence order {order[-1]:.2f}; Newton should be ~2"
    w0, v0 = impl.error_norms(impl.body_twist_error(fk_body(M, B, Q_TRUE + 0.2), T_GOAL))
    assert hist[0] == pytest.approx([w0, v0]), "history[0] is the error at the initial guess"


def test_convergence_order(impl):
    e = [1e-1, 1e-2, 1e-4, 1e-8]
    np.testing.assert_allclose(impl.convergence_order(e), [2.0, 2.0], rtol=1e-12)
    np.testing.assert_allclose(impl.convergence_order([1, 0.5, 0.25, 0.125]), [1, 1], rtol=1e-12)


def test_unreachable_target_reports_failure(impl):
    T = T_GOAL.copy()
    T[:3, 3] = [1.2, 0.3, 0.4]  # 1.3 m away: the UR5 reaches ~0.85 m
    q, ok, hist = impl.ik_newton(M, B, T, Q_TRUE, max_iters=25)
    assert ok is False, "an unreachable pose must return success = False"
    assert len(hist) == 26, "history = initial guess + max_iters iterates"
    assert np.hypot(*hist[-1]) > 0.1, "the error cannot go to zero for an unreachable pose"


def test_seed_decides_which_solution(impl):
    q0 = np.array([0.0, -0.2, 0.2, 0.0, 0.2, 0.0])  # close to the singular q = 0
    q, ok, _ = impl.ik_newton(M, B, T_GOAL, q0)
    assert ok, "this seed still converges..."
    np.testing.assert_allclose(fk_body(M, B, q), T_GOAL, atol=1e-8)
    assert np.abs(wrap(q - Q_TRUE)).max() > 0.5, "...but to a DIFFERENT one of the UR5's solutions"


def test_position_only_on_arm3(impl):
    M3, S3 = screws_from_dh(ARM3_DH)
    pos = lambda q: fk_dh(ARM3_DH, q)[:3, 3]  # noqa: E731
    jac = lambda q: geometric_jacobian(M3, S3, q)[:3]  # noqa: E731
    p = pos([0.5, 1.17, -1.77])  # an elbow-up configuration
    for seed, q3_sign in (([0.4, 1.0, -1.0], -1), ([0.4, 0.0, 1.0], +1)):
        q, ok, errs = impl.ik_newton_position(pos, jac, p, seed)
        assert ok and errs[-1] < 1e-10 and len(errs) <= 10
        assert np.sign(wrap(q)[2]) == q3_sign, ("seeded elbow-up you get elbow-up (q3 < 0); "
                                                "seeded elbow-down, elbow-down")
        assert np.linalg.norm(pos(q) - p) < 1e-10
    _, ok, errs = impl.ik_newton_position(pos, jac, [2.0, 0, 0], [0.1, 0.2, 0.3], max_iters=15)
    assert ok is False and len(errs) == 16


def test_uses_the_body_jacobian(impl):
    # one Newton step from a seed must equal J_b^+ V_b at that seed
    q0 = Q_TRUE + 0.1
    V = impl.body_twist_error(fk_body(M, B, q0), T_GOAL)
    q1, _, _ = impl.ik_newton(M, B, T_GOAL, q0, max_iters=1)
    np.testing.assert_allclose(q1, q0 + np.linalg.solve(jacobian_body(B, q0), V), atol=1e-10,
                               err_msg="the update is q += J_b(q)^+ V_b (body Jacobian with body twist)")
