import itertools

import numpy as np
import pytest

from labs.manipulators.toolbox import grasp_matrix

A = 0.02  # the box's half size, also the length scale for moments


def exact_epsilon(W):
    """Brute force: epsilon = smallest distance from the origin to a facet of conv(W).
    Every facet of a 6-D hull passes through 6 of the points; try them all (small W only)."""
    best = np.inf
    for idx in itertools.combinations(range(len(W)), 6):
        P = W[list(idx)]
        _, sv, Vt = np.linalg.svd(P[1:] - P[0])
        if sv[-1] < 1e-9:
            continue
        u = Vt[-1] * np.sign(Vt[-1] @ P[0] or 1.0)
        if np.all(W @ u <= u @ P[0] + 1e-9):
            best = min(best, u @ P[0])
    return best


def test_scaled_grasp_matrix_and_sigma_min(impl):
    cands = impl.box_grasp_candidates(A)
    pts = cands["four_finger"][0]
    G = np.asarray(impl.scaled_grasp_matrix(pts, A))
    G0 = grasp_matrix(pts)
    np.testing.assert_allclose(G[:3], G0[:3] / A, err_msg="moment rows divided by the length scale")
    np.testing.assert_allclose(G[3:], G0[3:], err_msg="force rows unchanged")
    assert impl.min_singular_value(impl.scaled_grasp_matrix(cands["pinch"][0], A)) < 1e-12, \
        "two point contacts can't twist the box about the line joining them: rank 5, sigma_min = 0"
    assert impl.min_singular_value(G) == pytest.approx(1.0, abs=1e-9), "four fingers: sigma_min = 1"
    s_top = impl.min_singular_value(impl.scaled_grasp_matrix(cands["top_only"][0], A))
    assert s_top > 0.2, "three contacts on the top face: G has full rank (it ignores that contacts only push)"


def test_primitive_wrenches(impl):
    pts, nrm = impl.box_grasp_candidates(A)["pinch"]
    W = np.asarray(impl.primitive_wrenches(pts, nrm, 0.5, k=6, length=A))
    assert W.shape == (12, 6), "k cone edges per contact, one 6-D wrench each"
    np.testing.assert_allclose(W[:, 3:] @ [1, 0, 0], np.r_[np.ones(6), -np.ones(6)], atol=1e-12,
                               err_msg="unit normal force: +x for the finger on -x, -x for the other")
    np.testing.assert_allclose(W[0, :3], np.cross(pts[0], W[0, 3:]) / A, atol=1e-12,
                               err_msg="moment part = (p x f) / length")
    Ws = np.asarray(impl.primitive_wrenches(pts, nrm, 0.5, k=6, length=A, torsion=0.004))
    assert Ws.shape == (24, 6), "soft finger: each edge twice, with +- torsion about the normal"


def test_epsilon_on_known_hulls(impl):
    W = np.vstack([np.eye(6), -np.eye(6)])   # the 6-D cross-polytope: inscribed radius 1/sqrt(6)
    assert impl.support(W, np.ones(6) / np.sqrt(6)) == pytest.approx(1 / np.sqrt(6)), "h(u) = max u.w"
    eps = impl.epsilon_metric(W)
    assert eps == pytest.approx(1 / np.sqrt(6), abs=1e-6), f"refined epsilon {eps:.6f} != 1/sqrt(6)"
    raw = impl.epsilon_sampled(W)
    assert 1 / np.sqrt(6) - 1e-12 <= raw < 1.25 / np.sqrt(6), "sampling alone is an upper bound, and rough"
    assert impl.epsilon_metric(W + [2, 0, 0, 0, 0, 0]) == pytest.approx(-1.0, abs=1e-6), \
        "origin outside the hull: -epsilon = its distance to the hull (here 2 - 1 = 1)"


def test_epsilon_matches_exact_facets(impl):
    cands = impl.box_grasp_candidates(A)
    for name in ("four_finger", "tripod"):
        W = np.asarray(impl.primitive_wrenches(*cands[name], 0.5, k=4, length=A))
        ex = exact_epsilon(W)
        assert impl.epsilon_metric(W) == pytest.approx(ex, abs=1e-5), \
            f"{name}: your epsilon must match the exhaustive facet search ({ex:.6f})"
    W = np.asarray(impl.primitive_wrenches(*cands["tripod"], 0.5, k=4, length=A))
    assert impl.epsilon_sampled(W) > 1.5 * exact_epsilon(W), \
        "for the tripod, 2000 random directions overestimate epsilon by > 50%: refinement matters"


def test_force_closure(impl):
    cands = impl.box_grasp_candidates(A)

    def fc(name, mu=0.5, torsion=0.0):
        return impl.is_force_closure(impl.primitive_wrenches(*cands[name], mu, 8, A, torsion))

    assert fc("four_finger") and fc("tripod"), "these grasps resist every wrench"
    for name in ("pinch", "adjacent_faces", "top_only"):
        assert not fc(name), f"{name} is NOT force closure"
    assert fc("pinch", torsion=0.005), "soft fingers (torsional friction) close the two-finger pinch"


def test_antipodal_friction_and_mu(impl):
    pts, nrm = impl.box_grasp_candidates(A)["pinch_offset"]
    mu_a = impl.antipodal_min_friction(pts[0], nrm[0], pts[1], nrm[1])
    assert mu_a == pytest.approx(0.5), "the line between the contacts is tan^-1(1/2) off the normals"
    eps = [impl.epsilon_metric(impl.primitive_wrenches(pts, nrm, mu, 8, A)) for mu in (0.45, 0.55)]
    assert eps[0] < -1e-3 and eps[1] > -1e-4, "below mu_antipodal the two fingers can't even squeeze"
    four = [impl.epsilon_metric(impl.primitive_wrenches(*impl.box_grasp_candidates(A)["four_finger"], mu, 8, A))
            for mu in (0.2, 0.5, 1.0)]
    assert four[0] < four[1] < four[2], "more friction, larger cones, better grasp"


def test_ranking(impl):
    rows = impl.rank_grasps(impl.box_grasp_candidates(A), 0.5, A)
    names = [r[0] for r in rows]
    assert names[:2] == ["four_finger", "tripod"], f"best two at mu = 0.5, got {names}"
    assert names[-1] == "top_only", "pushing only from above is the worst"
    assert all(rows[i][1] >= rows[i + 1][1] for i in range(len(rows) - 1)), "sorted by epsilon, best first"
    assert rows[0][1] == pytest.approx(0.2449, abs=2e-3), "four fingers, mu = 0.5, k = 8: epsilon ~ 0.245"
