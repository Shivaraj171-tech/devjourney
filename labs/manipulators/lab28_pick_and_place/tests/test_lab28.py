import numpy as np
import pytest

from labs.manipulators.toolbox import fk_space, screws_from_dh
from labs.manipulators.toolbox.models import BOX_HALF, GRIPPER_TCP
from labs.manipulators.toolbox.robots import UR5_DH, UR5_Q_MAX, UR5_Q_MIN
from labs.manipulators.toolbox.sim import mujoco_available

needs_mujoco = pytest.mark.skipif(not mujoco_available(), reason="optional: needs mujoco")
Q_HOME = np.array([0.0, -np.pi / 2, np.pi / 2, -np.pi / 2, -np.pi / 2, 0.0])
TARGET = np.array([-0.40, 0.20])
NAMES = ["pre", "grasp", "lift", "carry", "place", "retreat"]


def case(seed):
    """Box start and target yaw for one randomised trial (fixed seeds: deterministic)."""
    r = np.random.default_rng(seed)
    return np.array([-0.45, -0.15]) + r.uniform(-0.03, 0.03, 2), r.uniform(-0.5, 0.5), r.uniform(-0.5, 0.5)


_RUNS = {}


def run(impl, seed, **kw):
    key = (seed, tuple(sorted(kw.items())))
    if key not in _RUNS:
        bxy, byaw, tyaw = case(seed)
        _RUNS[key] = impl.run_pick_and_place(bxy, byaw, TARGET, tyaw, **kw)
    return _RUNS[key]


def test_tool_model_and_pose(impl):
    M_tool, S, B = impl.tool_model()
    M, S0 = screws_from_dh(UR5_DH)
    T_flange = fk_space(M, S0, Q_HOME)
    np.testing.assert_allclose(fk_space(M_tool, S, Q_HOME)[:3, 3], T_flange[:3, 3] + GRIPPER_TCP * T_flange[:3, 2],
                               atol=1e-12, err_msg="the TCP sits GRIPPER_TCP along the flange z axis")
    assert np.asarray(B).shape == (6, 6), "body screws of the TOOL frame (recompute them for M_tool)"
    T = np.asarray(impl.tool_pose([0.1, 0.2], 0.3, 0.4))
    np.testing.assert_allclose(T[:3, 3], [0.1, 0.2, 0.3])
    np.testing.assert_allclose(T[:3, 2], [0, 0, -1], atol=1e-12, err_msg="the gripper points straight down")
    np.testing.assert_allclose(T[:3, 1], [np.sin(0.4), -np.cos(0.4), 0], atol=1e-12,
                               err_msg="fingers close along Rz(yaw) Rx(pi) y = (sin yaw, -cos yaw, 0)")


def test_grasp_yaw(impl):
    for box_yaw in (0.1, -1.4, 2.9, 0.0):
        y = impl.grasp_yaw(box_yaw)
        k = (y - box_yaw) / (np.pi / 2)
        assert abs(k - round(k)) < 1e-9, "a cube is symmetric every quarter turn: yaw = box_yaw + k pi/2"
        assert abs(np.angle(np.exp(1j * (y - np.pi / 2)))) <= np.pi / 4 + 1e-9, \
            "pick the equivalent yaw closest to the home wrist yaw (pi/2)"


def test_waypoints_reach_their_poses(impl):
    bxy, byaw, tyaw = case(0)
    wp = impl.plan_waypoints(bxy, byaw, TARGET, tyaw)
    assert list(wp) == NAMES, f"waypoints in order {NAMES}"
    M_tool, S, _ = impl.tool_model()
    Ts = {n: fk_space(M_tool, S, wp[n]) for n in NAMES}
    for n in NAMES:
        assert np.all(wp[n] >= UR5_Q_MIN - 1e-9) and np.all(wp[n] <= UR5_Q_MAX + 1e-9), f"{n}: within limits"
        np.testing.assert_allclose(Ts[n][:3, 2], [0, 0, -1], atol=1e-6, err_msg=f"{n}: gripper vertical")
    np.testing.assert_allclose(Ts["grasp"][:3, 3], [*bxy, BOX_HALF + 0.005], atol=1e-6,
                               err_msg="grasp: TCP over the box centre, pads 5 mm above the table")
    np.testing.assert_allclose(Ts["place"][:2, 3], TARGET, atol=1e-6, err_msg="place: over the target")
    assert Ts["carry"][2, 3] > 0.15, "carry high enough to clear the table"
    steps = [np.abs(wp[b] - wp[a]).max() for a, b in zip(NAMES, NAMES[1:])]
    assert max(steps) < 2.0, f"warm-started IK keeps one branch: no joint jumps by > 2 rad ({max(steps):.2f})"


def test_segments_and_reference(impl):
    bxy, byaw, tyaw = case(0)
    segs = impl.plan_segments(impl.plan_waypoints(bxy, byaw, TARGET, tyaw))
    assert [s[3] for s in segs] == ["open", "open", "close", "close", "close", "close", "open", "open"]
    ref, T = impl.segment_reference(segs)
    assert T == pytest.approx(sum(s[2] for s in segs)) and T == pytest.approx(7.7)
    t_end = 0.0
    for qa, qb, dur, grip in segs:
        q0, qd0, _, g0 = ref(t_end + 1e-9)
        np.testing.assert_allclose(q0, qa, atol=1e-6, err_msg="each segment starts at its q_from")
        assert np.abs(qd0).max() < 1e-6 and g0 == grip, "rest-to-rest quintics, gripper per segment"
        t_end += dur
        np.testing.assert_allclose(ref(t_end - 1e-9)[0], qb, atol=1e-6, err_msg="and ends at q_to")
    np.testing.assert_allclose(ref(T + 5)[0], segs[-1][1], err_msg="hold the last pose afterwards")


@needs_mujoco
@pytest.mark.parametrize("seed", [0, 1, 2])
def test_pick_and_place_in_mujoco(impl, seed):
    res = run(impl, seed)
    _, _, tyaw = case(seed)
    dxy, dyaw, z = impl.placement_error(res, TARGET, tyaw)
    assert dxy < 0.015, f"seed {seed}: box ended {dxy * 1e3:.1f} mm from the target (tolerance 15 mm)"
    assert dyaw < 0.05, f"seed {seed}: box yaw off by {dyaw:.3f} rad"
    assert z == pytest.approx(BOX_HALF, abs=2e-3), "the box must end resting on the table"
    held = impl.held_during_transport(res)
    assert held < 0.02, f"seed {seed}: the box left the hand during transport ({held * 1e3:.0f} mm)"
    t, ends = res["t"], res["segments_end"]
    carried = res["box"][(t >= ends[3]) & (t <= ends[4]), 2]
    assert carried.min() > 0.15, "it was really lifted and carried (not pushed along the table)"


@needs_mujoco
def test_friction_really_holds_the_box(impl):
    res = run(impl, 0, mu=0.02)   # below m g / (2 N) = 0.1 * 9.81 / 30 = 0.033 (lab 26)
    dxy, _, _ = impl.placement_error(res, TARGET)
    start = case(0)[0]
    assert dxy > 0.3 and np.linalg.norm(res["final_box"][:2] - start) < 0.03, \
        "with pad friction below lab 26's threshold the box must slip out and stay behind"
