import numpy as np
import pytest

from labs.manipulators.toolbox import UR5E_DH, exp_so3, fk_dh, log_so3, path_deviation
from labs.manipulators.toolbox.robots import UR5E_QD_MAX, UR5E_QDD_MAX
from labs.manipulators.toolbox.sim import KinematicSim, MujocoSim, mujoco_available

QA = np.array([0.0, -1.2, 1.5, -1.9, -1.57, 0.0])
QB = np.array([0.9, -1.7, 1.9, -1.6, -1.2, 0.8])
TA, TB = fk_dh(UR5E_DH, QA), fk_dh(UR5E_DH, QB)
DT, T = 0.01, 2.0
TS = np.arange(0, T + 1e-9, DT)
_CACHE = {}


@pytest.fixture
def cart(impl):
    def get():  # cached: ~0.3 s of IK
        if "cart" not in _CACHE:
            _CACHE["cart"] = impl.cartesian_trajectory(TA, TB, T, TS, QA)
        return _CACHE["cart"]
    return get


def test_joint_trajectory(impl):
    Q, Qd, Qdd = (np.asarray(x) for x in impl.joint_trajectory(QA, QB, T, TS))
    assert Q.shape == Qd.shape == Qdd.shape == (len(TS), 6)
    np.testing.assert_allclose(Q[0], QA) and np.testing.assert_allclose(Q[-1], QB)
    np.testing.assert_allclose(Qd[[0, -1]], 0, atol=1e-12, err_msg="rest to rest")
    np.testing.assert_allclose(Qd[100], 15 / 16 * (QB - QA), err_msg="peak qdot = 15/(8T) dq at T/2")
    np.testing.assert_allclose(np.gradient(Q, DT, axis=0)[1:-1], Qd[1:-1], atol=2e-3,
                               err_msg="Qd must be dQ/dt")


def test_joint_space_line_is_curved_in_task_space(impl):
    Q, _, _ = impl.joint_trajectory(QA, QB, T, TS)
    P = np.asarray(impl.ee_positions(Q))
    assert P.shape == (len(TS), 3)
    np.testing.assert_allclose(P[0], TA[:3, 3], atol=1e-12)
    dev = path_deviation(P, TA[:3, 3], TB[:3, 3]).max()
    assert dev > 0.05, f"the joint-space move bows {dev * 100:.1f} cm off the line (we expect ~8 cm)"


def test_sync_trapezoid(impl):
    Tm, ta, vs, as_ = impl.sync_trapezoid(QA, QB, UR5E_QD_MAX, UR5E_QDD_MAX)
    D = np.abs(QB - QA)
    assert vs == pytest.approx(np.min(UR5E_QD_MAX / D)) and as_ == pytest.approx(np.min(UR5E_QDD_MAX / D))
    q0 = np.array([0.0, 0.0])
    Tm2, *_ = impl.sync_trapezoid(q0, [1.0, 0.0], [1.0, 1.0], [2.0, 2.0])
    assert Tm2 == pytest.approx(1.5), "a joint that does not move must not constrain (or divide by 0)"
    ts = np.linspace(0, Tm, 2001)
    Q, Qd, Qdd = (np.asarray(x) for x in impl.trapezoid_joint_trajectory(QA, QB, UR5E_QD_MAX, UR5E_QDD_MAX, ts))
    np.testing.assert_allclose(Q[-1], QB, atol=1e-9, err_msg="all joints arrive together at T")
    ratio = np.abs(Qd).max(axis=0) / UR5E_QD_MAX
    assert ratio.max() == pytest.approx(1.0, rel=1e-3) or (np.abs(Qdd).max(axis=0) / UR5E_QDD_MAX).max() \
        == pytest.approx(1.0, rel=1e-3), "minimum time: the binding joint reaches a limit"
    assert ratio.max() <= 1 + 1e-9 and (np.abs(Qdd).max(axis=0) / UR5E_QDD_MAX).max() <= 1 + 1e-9


def test_cartesian_poses_slerp(impl):
    s = np.linspace(0, 1, 7)
    poses = np.asarray(impl.cartesian_poses(TA, TB, s))
    assert poses.shape == (7, 4, 4)
    np.testing.assert_allclose(poses[0], TA, atol=1e-12)
    np.testing.assert_allclose(poses[-1], TB, atol=1e-12)
    w = log_so3(TA[:3, :3].T @ TB[:3, :3])
    for si, P in zip(s, poses):
        np.testing.assert_allclose(P[:3, :3], TA[:3, :3] @ exp_so3(si * w), atol=1e-10,
                                   err_msg="slerp = R_A exp(s log(R_A^T R_B))")
        np.testing.assert_allclose(P[:3, 3], TA[:3, 3] + si * (TB[:3, 3] - TA[:3, 3]), atol=1e-12)


def test_cartesian_trajectory_is_straight(impl, cart):
    Q, ok = cart()
    Q = np.asarray(Q)
    assert ok, "every IK solve along the path must succeed"
    assert Q.shape == (len(TS), 6)
    P = np.asarray(impl.ee_positions(Q))
    dev = path_deviation(P, TA[:3, 3], TB[:3, 3]).max()
    assert dev < 1e-6, f"the Cartesian move must follow the line: {dev * 1e3:.4f} mm off"
    np.testing.assert_allclose(Q[0], QA, atol=1e-6)
    np.testing.assert_allclose(fk_dh(UR5E_DH, Q[-1]), TB, atol=1e-8)
    assert np.abs(np.diff(Q, axis=0)).max() < 0.1, \
        "no jumps between samples: warm-start each IK from the previous solution (and unwrap)"


def test_finite_differences_and_limits(impl, cart):
    Q, _ = cart()
    Qd, Qdd, Qddd = (np.asarray(x) for x in impl.finite_differences(np.asarray(Q), DT))
    np.testing.assert_allclose(Qd, np.gradient(np.asarray(Q), DT, axis=0))
    rep = impl.limit_check(Qd, Qdd, UR5E_QD_MAX, UR5E_QDD_MAX)
    assert rep["ok"] and 0.1 < rep["vel_ratio"] < 1, f"a 2 s move is within the UR5e limits: {rep}"
    assert np.abs(Qd[[0, -1]]).max() < 1e-3, "the quintic timing starts and ends (nearly) at rest"
    assert np.isfinite(Qddd).all() and np.abs(Qddd).max() < 50, "smooth: bounded jerk"
    ts = np.arange(0, 0.4 + 1e-9, DT)
    Qf, _ = impl.cartesian_trajectory(TA, TB, 0.4, ts, QA)
    fast = impl.limit_check(*impl.finite_differences(np.asarray(Qf), DT)[:2], UR5E_QD_MAX, UR5E_QDD_MAX)
    assert not fast["ok"] and fast["acc_ratio"] > 2, "the same move in 0.4 s must violate the limits"
    assert impl.limit_check(np.ones((2, 1)), np.ones((2, 1)) * 3, [2.0], [2.0]) == \
        {"vel_ratio": 0.5, "acc_ratio": 1.5, "ok": False}


def test_track_on_kinematic_robot(impl, cart):
    Q, _ = cart()
    P, Qm = (np.asarray(x) for x in impl.track_in_mujoco(KinematicSim(UR5E_DH, QA), np.asarray(Q), DT))
    assert P.shape == (len(TS), 3) and Qm.shape == (len(TS), 6), "one measurement per sample, incl. t=0"
    np.testing.assert_allclose(Qm, Q, atol=1e-9, err_msg="a perfect robot follows Q exactly")


@pytest.mark.skipif(not mujoco_available(), reason="optional: needs mujoco")
def test_track_in_mujoco(impl, cart):
    Q, _ = cart()
    Q = np.vstack([np.asarray(Q), np.repeat(np.asarray(Q)[-1:], 50, axis=0)])  # + 0.5 s hold
    P, Qm = (np.asarray(x) for x in impl.track_in_mujoco(MujocoSim(UR5E_DH, QA), Q, DT))
    dev = path_deviation(P, TA[:3, 3], TB[:3, 3]).max()
    assert dev < 1e-3, f"MuJoCo: Cartesian move {dev * 1e3:.2f} mm off the line (want < 1 mm)"
    assert np.linalg.norm(P[-1] - TB[:3, 3]) < 1e-4, "after the hold the arm is at the goal"
    Qj, _, _ = impl.joint_trajectory(QA, QB, T, TS)
    Pj, _ = impl.track_in_mujoco(MujocoSim(UR5E_DH, QA), np.asarray(Qj), DT)
    assert path_deviation(np.asarray(Pj), TA[:3, 3], TB[:3, 3]).max() > 0.05, \
        "...while the joint-space move bows off the line in the simulator too"
