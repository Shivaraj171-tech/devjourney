import numpy as np
import pytest

from labs.manipulators.toolbox import ARM3_DH, fk_dh

KEYS = {("front", "up"), ("front", "down"), ("back", "up"), ("back", "down")}


def tip(q):
    return fk_dh(ARM3_DH, q)[:3, 3]


def test_wrap_to_pi(impl):
    w = np.asarray(impl.wrap_to_pi(np.array([0.0, np.pi, -np.pi, 3 * np.pi / 2, -7.0, 2 * np.pi])))
    np.testing.assert_allclose(w, [0.0, np.pi, np.pi, -np.pi / 2, -7.0 + 2 * np.pi, 0.0], atol=1e-12,
                               err_msg="wrap to (-pi, pi]: pi and -pi both become +pi")


def test_planar2r_ik(impl):
    a2, a3 = 0.4, 0.3
    rng = np.random.default_rng(0)
    for _ in range(20):
        r, s = rng.uniform(-0.5, 0.5, size=2)
        if not 0.11 < np.hypot(r, s) < 0.69:
            continue
        for sign in (+1, -1):
            sol = impl.planar2r_ik(r, s, a2, a3, sign)
            assert sol is not None, f"(r, s) = ({r:.3f}, {s:.3f}) is reachable"
            q2, q3 = sol
            assert np.sign(q3) == sign, "q3 must have the sign of elbow_sign"
            reach = (a2 * np.cos(q2) + a3 * np.cos(q2 + q3), a2 * np.sin(q2) + a3 * np.sin(q2 + q3))
            np.testing.assert_allclose(reach, (r, s), atol=1e-12,
                                       err_msg="the 2R tip must land on (r, s): check the q2 formula")
    assert impl.planar2r_ik(0.8, 0.0, a2, a3, 1) is None, "beyond a2 + a3: unreachable -> None"
    assert impl.planar2r_ik(0.05, 0.0, a2, a3, 1) is None, "inside |a2 - a3|: unreachable -> None"
    q2, q3 = impl.planar2r_ik(0.7, 0.0, a2, a3, -1)
    assert abs(q3) < 1e-6 and abs(q2) < 1e-6, "fully stretched: q3 = 0 (clip cos q3 to [-1, 1])"


def test_all_solutions_reach_the_target(impl):
    rng = np.random.default_rng(1)
    for _ in range(15):
        q_true = rng.uniform([-np.pi, -np.pi, -2.8], [np.pi, np.pi, 2.8])
        p = tip(q_true)
        sols = impl.arm3_ik_all(p)
        assert set(sols) == KEYS, f"a generic reachable point has 4 solutions, got {sorted(sols)}"
        for key, q in sols.items():
            err = np.linalg.norm(tip(q) - p)
            assert err < 1e-9, f"{key}: FK of your solution misses the target by {err:.2e} m"
            assert np.all(np.abs(q) <= np.pi + 1e-12), f"{key}: wrap angles to (-pi, pi]"
        dist = min(np.abs(np.asarray(impl.wrap_to_pi(np.asarray(q) - q_true))).max()
                   for q in sols.values())
        assert dist < 1e-8, "the configuration that generated p must be one of your solutions"


def test_elbow_labels(impl):
    p = np.array([0.35, 0.2, 0.5])
    sols = impl.arm3_ik_all(p)
    for shoulder in ("front", "back"):
        up, down = sols[(shoulder, "up")], sols[(shoulder, "down")]
        z_up = fk_dh(ARM3_DH[:2], up[:2])[2, 3]     # elbow height
        z_down = fk_dh(ARM3_DH[:2], down[:2])[2, 3]
        assert z_up > z_down, f"{shoulder}: the 'up' elbow should be higher than the 'down' one"
    assert sols[("front", "up")][2] < 0, "front + elbow up means q3 < 0 for this arm"
    assert sols[("back", "up")][2] > 0, "...and for the back solutions the sign flips"
    assert impl.elbow_is_up(sols[("back", "up")]) and not impl.elbow_is_up(sols[("front", "down")])
    np.testing.assert_allclose(impl.arm3_ik(p, "front", "down"), sols[("front", "down")])


def test_front_faces_the_target(impl):
    q = impl.arm3_ik([0.3, 0.3, 0.4], "front", "up")
    assert q[0] == pytest.approx(np.pi / 4), "front: q1 = atan2(y, x)"
    q = impl.arm3_ik([0.3, 0.3, 0.4], "back", "up")
    assert q[0] == pytest.approx(np.pi / 4 - np.pi), "back: q1 = atan2(y, x) + pi, wrapped"


def test_unreachable_and_reachable(impl):
    for p in ([1.0, 0.0, 0.3], [0.0, 0.0, 1.2], [0.05, 0.0, 0.3]):
        assert impl.arm3_ik_all(p) == {}, f"{p} is out of reach: return an empty dict"
        assert impl.is_reachable(p) is False
        assert impl.arm3_ik(p) is None
    assert impl.is_reachable([0.4, 0.1, 0.5]) is True


def test_target_on_the_base_axis(impl):
    p = np.array([0.0, 0.0, 0.8])
    sols = impl.arm3_ik_all(p)
    assert sols, "a point straight above the shoulder is reachable (q1 is then arbitrary)"
    for key, q in sols.items():
        assert np.linalg.norm(tip(q) - p) < 1e-9, f"{key} misses the target"
    assert sols[("front", "up")][0] == pytest.approx(0.0), "on the axis use q1 = 0 for 'front'"


def test_fk_position_error(impl):
    q = np.array([0.2, 0.5, -0.4])
    assert impl.fk_position_error(q, tip(q)) == pytest.approx(0.0, abs=1e-12)
    assert impl.fk_position_error(q, tip(q) + [0, 0.03, 0.04]) == pytest.approx(0.05)
