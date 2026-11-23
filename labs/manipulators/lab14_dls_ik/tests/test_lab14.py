import numpy as np
import pytest

from labs.manipulators.toolbox import (
    UR5_DH, body_screws, body_twist_error, fk_body, jacobian_body, screws_from_dh,
)

M, S = screws_from_dh(UR5_DH)
B = body_screws(M, S)
Q_TRUE = np.array([0.3, -1.1, 1.4, -1.8, -1.4, 0.5])
T_GOAL = fk_body(M, B, Q_TRUE)
Q_WRIST_SING = np.array([0.3, -1.1, 1.4, -1.8, 1e-4, 0.5])  # sin q5 ~ 0
T_NEAR_SING = fk_body(M, B, np.array([0.3, -1.1, 1.4, -1.6, 0.05, 0.9]))
LIM = np.pi * np.ones(6)


def wrap(q):
    return np.mod(np.asarray(q) + np.pi, 2 * np.pi) - np.pi


def test_dls_step(impl, rng):
    J = rng.normal(size=(6, 6))
    e = rng.normal(size=6)
    np.testing.assert_allclose(impl.dls_step(J, e, 0.0), np.linalg.solve(J, e), atol=1e-9,
                               err_msg="lam = 0 and full rank: the Newton step")
    Jr = rng.normal(size=(3, 5))
    lam = 0.3
    expected = np.linalg.solve(Jr.T @ Jr + lam**2 * np.eye(5), Jr.T @ e[:3])
    np.testing.assert_allclose(impl.dls_step(Jr, e[:3], lam), expected, atol=1e-12,
                               err_msg="must equal the minimiser (J^T J + lam^2 I)^-1 J^T e")


def test_damping_bounds_the_step_near_a_singularity(impl):
    J = jacobian_body(B, Q_WRIST_SING)
    V = body_twist_error(fk_body(M, B, Q_WRIST_SING), T_NEAR_SING)
    newton = np.abs(np.linalg.lstsq(J, V, rcond=None)[0]).max()
    step = np.asarray(impl.dls_step(J, V, 0.05))
    assert newton > 30, "(sanity) the undamped step here is huge"
    assert np.abs(step).max() < 1.0, f"DLS step {np.abs(step).max():.1f} rad; damping should bound it"
    assert np.linalg.norm(step) <= np.linalg.norm(V) / (2 * 0.05) + 1e-12, "|dq| <= |e| / (2 lam)"


def test_clamp_to_limits(impl):
    q = impl.clamp_to_limits([4.0, -0.5, 0.5, 7.0, 0, 0], -LIM / 2, LIM / 2)
    np.testing.assert_allclose(q, [-np.pi / 2, -0.5, 0.5, 7.0 - 2 * np.pi, 0, 0], atol=1e-12,
                               err_msg="wrap first (4 -> -2.28, 7 -> 0.72), then clip to the limits")
    np.testing.assert_allclose(impl.clamp_to_limits([4.0, 0, 0], None, None),
                               [4.0 - 2 * np.pi, 0, 0], err_msg="no limits: just wrap")


def test_lm_converges_from_near_singular_seed(impl):
    q, ok, info = impl.ik_lm(M, B, T_NEAR_SING, Q_WRIST_SING)
    assert ok, "LM must converge from the near-singular seed"
    assert info["iterations"] <= 8, (f"took {info['iterations']} iterations; plain Newton needs ~20 "
                                     "here, LM ~4")
    np.testing.assert_allclose(fk_body(M, B, q), T_NEAR_SING, atol=1e-8)
    assert np.all(np.diff(info["costs"]) <= 0), "accepted costs never increase"
    assert len(info["lambdas"]) == info["iterations"]


def test_lm_from_random_seeds(impl):
    rng = np.random.default_rng(0)
    for seed in rng.uniform(-np.pi, np.pi, (20, 6)):
        q, ok, info = impl.ik_lm(M, B, T_GOAL, seed)
        assert ok, f"LM failed from seed {np.round(seed, 2)} (the reference converges from all 20)"
        assert np.all(np.abs(q) <= np.pi + 1e-12), "solutions are wrapped to (-pi, pi]"
        assert np.all(np.diff(info["costs"]) <= 0)


def test_unreachable_gives_bounded_best_effort(impl):
    T = T_GOAL.copy()
    T[:3, 3] = [1.2, 0.3, 0.4]
    q, ok, info = impl.ik_lm(M, B, T, Q_TRUE)
    assert ok is False
    assert np.all(np.abs(q) <= np.pi + 1e-12), "joints stay bounded (Newton wound up to ~100 rad)"
    start = np.linalg.norm(fk_body(M, B, Q_TRUE)[:3, 3] - T[:3, 3])
    end = np.linalg.norm(fk_body(M, B, q)[:3, 3] - T[:3, 3])
    assert end < start - 0.2, f"best effort should get closer: {start:.2f} m -> {end:.2f} m"
    assert info["costs"][-1] <= info["costs"][0]


def test_joint_limits_are_respected(impl):
    q_max = LIM.copy()
    q_max[2] = 0.0  # forbid the elbow sign of Q_TRUE (q3 = +1.4)
    q, ok, _ = impl.ik_lm(M, B, T_GOAL, [0, -1.2, -1.0, -1.9, -1.57, 0], -LIM, q_max)
    assert ok, "a solution with q3 <= 0 exists (the other elbow): LM should find it"
    assert impl.within_limits(q, -LIM, q_max) and q[2] <= 1e-9
    np.testing.assert_allclose(fk_body(M, B, q), T_GOAL, atol=1e-8)
    assert impl.within_limits([0, 0.1], [-1, -1], [1, 1]) and not impl.within_limits([0, 1.1], [-1, -1], [1, 1])


def test_distinct_solutions(impl):
    a = np.array([0.1, 0.2, 0.3])
    sols = impl.distinct_solutions([a, a + 1e-6, a + [2 * np.pi, 0, 0], -a])
    assert len(sols) == 2, "near-duplicates and 2 pi shifts are the same solution"


def test_multi_start_finds_all_eight(impl):
    seeds = np.random.default_rng(0).uniform(-np.pi, np.pi, (40, 6))
    sols = impl.multi_start_ik(M, B, T_GOAL, seeds)
    assert len(sols) == 8, f"found {len(sols)} distinct UR5 solutions; a generic pose has 8"
    for q in sols:
        np.testing.assert_allclose(fk_body(M, B, q), T_GOAL, atol=1e-8)


def test_select_solution(impl):
    cands = [np.array([0.0, 0.0]), np.array([1.0, 0.0]), np.array([3.0, 3.0])]
    np.testing.assert_allclose(impl.select_solution(cands, [0.9, 0.1]), [1.0, 0.0])
    np.testing.assert_allclose(impl.select_solution(cands, [1.5, 2.5]), [3.0, 3.0])
    np.testing.assert_allclose(impl.select_solution(cands, [1.5, 2.5], weights=[100, 1]), [1.0, 0.0],
                               err_msg="weights: an expensive joint 1 makes the closest-in-joint-1 "
                                       "candidate win")
    np.testing.assert_allclose(impl.select_solution(cands, [2.9, 2.9], [-2, -2], [2, 2]), [1.0, 0.0],
                               err_msg="candidates outside the limits are not allowed")
    assert impl.select_solution(cands, [0, 0], [5, 5], [6, 6]) is None
    q = impl.select_solution([np.array([3.0]), np.array([-3.0])], [-2.0])
    assert q[0] == pytest.approx(-3.0), "plain difference (no short way through +-pi)"
