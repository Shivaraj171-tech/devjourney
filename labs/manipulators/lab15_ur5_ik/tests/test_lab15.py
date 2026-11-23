import numpy as np
import pytest

from labs.manipulators.toolbox import (
    UR5_DH, euler_zyx_to_matrix, fk_dh, make_transform, pose_error, rot_x,
)
from labs.manipulators.toolbox.robots import UR5_Q_MAX, UR5_Q_MIN
from labs.manipulators.toolbox.sim import MujocoSim, mujoco_available

Q0 = np.array([0.0, -1.2, 1.5, -1.9, -1.57, 0.0])
REACHABLE = ["pick_left", "pick_right", "place_high", "tilted", "side"]
needs_mujoco = pytest.mark.skipif(not mujoco_available(), reason="optional: needs mujoco")


def _pose(p, rpy):
    return make_transform(euler_zyx_to_matrix(*rpy), p)


POSES = {
    "pick_left": _pose([0.40, 0.20, 0.15], (0.3, 0.0, np.pi)),
    "pick_right": _pose([0.30, -0.35, 0.10], (-0.5, 0.0, np.pi)),
    "place_high": _pose([-0.20, 0.45, 0.35], (1.8, 0.0, np.pi)),
    "tilted": _pose([0.45, 0.05, 0.40], (0.0, 0.6, 2.6)),
    "side": _pose([0.10, 0.55, 0.20], (np.pi / 2, np.pi / 2, 0.0)),
    "too_far": _pose([0.95, 0.40, 0.20], (0.0, 0.0, np.pi)),
}
_CACHE = {}


@pytest.fixture
def poses():
    return POSES


@pytest.fixture
def rows(impl):
    # computed lazily inside each test (a TODO then fails the test instead of erroring the
    # fixture), and only once per run: the campaign takes ~1.5 s
    def get():
        if "rows" not in _CACHE:
            _CACHE["rows"] = impl.ik_campaign(POSES, Q0)
        return _CACHE["rows"]
    return get


def test_make_pose(impl):
    T = np.asarray(impl.make_pose([0.1, 0.2, 0.3], (0.0, 0.0, np.pi)))
    assert T.shape == (4, 4)
    np.testing.assert_allclose(T[:3, 3], [0.1, 0.2, 0.3])
    np.testing.assert_allclose(T[:3, :3], rot_x(np.pi), atol=1e-12)
    np.testing.assert_allclose(T[:3, 2], [0, 0, -1], atol=1e-12, err_msg="roll pi: tool z points down")
    T = np.asarray(impl.make_pose([0, 0, 0], (0.3, 0.2, 0.1)))
    from labs.manipulators.toolbox import euler_zyx_to_matrix
    np.testing.assert_allclose(T[:3, :3], euler_zyx_to_matrix(0.3, 0.2, 0.1), atol=1e-12,
                               err_msg="rpy = (yaw, pitch, roll) in the ZYX convention of lab 02")


def test_ik_seeds(impl):
    s = np.asarray(impl.ik_seeds(Q0, 16))
    assert s.shape == (17, 6), "q_seed plus 16 random seeds"
    np.testing.assert_allclose(s[0], Q0, err_msg="the current configuration is the first seed")
    assert np.all(s >= UR5_Q_MIN) and np.all(s <= UR5_Q_MAX)
    np.testing.assert_allclose(s, impl.ik_seeds(Q0, 16), err_msg="seeds must be reproducible")


def test_solve_picks_the_closest_solution(impl, poses):
    q, cands = impl.solve_ur5_pose(poses["pick_right"], Q0)
    assert q is not None and len(cands) >= 4, "a reachable pose has several solutions"
    dists = [np.linalg.norm(np.asarray(c) - Q0) for c in cands]
    assert np.linalg.norm(np.asarray(q) - Q0) == pytest.approx(min(dists)), \
        "choose the candidate closest to the seed"
    for c in cands:
        assert np.all(np.abs(pose_error(fk_dh(UR5_DH, c), poses["pick_right"])) < 1e-6)


def test_campaign_rows(impl, rows):
    rows = rows()
    assert [r["name"] for r in rows] == REACHABLE + ["too_far"], "one row per pose, in order"
    for r in rows:
        for key in ("name", "success", "q", "n_solutions", "pos_err", "rot_err"):
            assert key in r, f"row is missing {key!r}"


def test_reachable_poses_are_solved_accurately(impl, rows, poses):
    rows = rows()
    for r in rows[:-1]:
        assert r["success"], f"{r['name']} is reachable but IK failed"
        assert r["pos_err"] < 1e-6, f"{r['name']}: position error {r['pos_err'] * 1e3:.3g} mm"
        assert r["rot_err"] < 1e-6, f"{r['name']}: rotation error {np.degrees(r['rot_err']):.3g} deg"
        dp, dr = pose_error(fk_dh(UR5_DH, r["q"]), poses[r["name"]])
        assert r["pos_err"] == pytest.approx(dp, abs=1e-12), "errors come from DH FK at the chosen q"
        assert np.all(np.asarray(r["q"]) >= UR5_Q_MIN - 1e-9) and np.all(np.asarray(r["q"]) <= UR5_Q_MAX + 1e-9)


def test_unreachable_pose_is_reported(impl, rows):
    rows = rows()
    r = rows[-1]
    assert r["success"] is False and r["q"] is None, "too_far is ~1 m away: must be reported as failed"
    assert np.isnan(r["pos_err"]) and r["n_solutions"] == 0


def test_campaign_seeds_with_previous_solution(impl, rows, poses):
    rows = rows()
    q_prev = rows[0]["q"]
    q, cands = impl.solve_ur5_pose(poses["pick_right"], q_prev)
    np.testing.assert_allclose(rows[1]["q"], q, atol=1e-6,
                               err_msg="pose 2 must be seeded with pose 1's solution, not with q_start")


def test_format_report(impl, rows):
    rows = rows()
    text = impl.format_report(rows)
    lines = text.strip().splitlines()
    assert len(lines) == len(rows) + 1, "a header line plus one line per pose"
    assert "too_far" in lines[-1] and "NO" in lines[-1]
    assert all(name in text for name in REACHABLE)


@needs_mujoco
def test_mujoco_kinematics_agree(impl, rows, poses):
    rows = rows()
    errs = impl.mujoco_kinematic_errors(rows, poses)
    assert len(errs) == len(rows)
    for r, (dp, dr) in zip(rows[:-1], errs[:-1]):
        assert dp < 1e-6 and dr < 1e-6, f"{r['name']}: MuJoCo says {dp * 1e3:.3g} mm, {np.degrees(dr):.3g} deg"
    assert np.isnan(errs[-1][0])


@needs_mujoco
def test_mujoco_arm_physically_arrives(impl, rows, poses):
    rows = rows()
    sim = MujocoSim(UR5_DH, Q0)
    for r in rows[:-1]:
        T = impl.drive_mujoco(sim, r["q"])
        dp, dr = pose_error(T, poses[r["name"]])
        assert dp < 1e-4 and dr < np.radians(0.01), (
            f"{r['name']}: after the ramp and hold the simulated arm is {dp * 1e3:.3f} mm / "
            f"{np.degrees(dr):.4f} deg off (want < 0.1 mm, 0.01 deg)")
