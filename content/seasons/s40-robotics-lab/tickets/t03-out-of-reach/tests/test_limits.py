import math

from lab import viz

from grabby.arm import FOREARM, UPPER_ARM, forward
from grabby.limits import ELBOW_LIMITS, SHOULDER_LIMITS, clamp, plan_reach, reachable, within_limits

# Boxes Maya wants to try: (x, y, can Grabby do it?)
BOXES = [(1.2, 0.5, True), (1.2, 0.1, True), (0.1, 0.05, False), (2.0, 0.5, False), (0.5, -0.2, False), (-0.6, 1.2, True)]


def show_boxes():
    """Shade where the gripper can reach within the limits, and try every box."""
    frames, targets, marks = [], [], []
    pose = [0.0, 0.0]
    for x, y, _ in BOXES:
        try:
            plan = plan_reach(x, y)
        except Exception:
            plan = None
        marks.append((x, y, "reached" if plan else "refused", plan is not None))
        goal = [math.radians(a) for a in plan] if plan else pose
        for i in range(1, 16):
            frames.append([pose[j] + (goal[j] - pose[j]) * i / 15 for j in range(2)])
            targets.append((x, y))
        pose = goal
    limits = [[math.radians(v) for v in SHOULDER_LIMITS], [math.radians(v) for v in ELBOW_LIMITS]]
    viz.arm(frames, (UPPER_ARM, FOREARM), name="boxes", title="Which boxes can Grabby reach?", targets=targets, marks=marks,
            limits=limits, caption="Shaded: everywhere the gripper can get to without breaking a joint limit. ✕ = refused.")


def test_clamp_keeps_a_value_inside_its_range():
    assert clamp(250, -20, 200) == 200, f"clamp(250, -20, 200) should be 200, got {clamp(250, -20, 200)}"
    assert clamp(-90, -20, 200) == -20, f"clamp(-90, -20, 200) should be -20, got {clamp(-90, -20, 200)}"
    assert clamp(45, -20, 200) == 45, f"clamp(45, -20, 200) should be 45, got {clamp(45, -20, 200)}"


def test_a_box_too_far_away_is_refused():
    assert plan_reach(2.0, 0.5) is None, "(2.0, 0.5) is 2.06 m away, more than the arm's 1.8 m: plan_reach should return None"


def test_a_box_too_close_is_refused():
    assert not reachable(0.1, 0.05), "(0.1, 0.05) is only 0.11 m from the shoulder, closer than the 0.2 m the folded arm can reach"
    assert plan_reach(0.1, 0.05) is None, "plan_reach(0.1, 0.05) should return None (too close to reach)"


def test_both_joints_must_be_inside_their_limits():
    assert not within_limits(30, 150), "elbow 150 is past its limit of 140: within_limits(30, 150) should be False"
    assert not within_limits(-30, 0), "shoulder -30 is past its limit of -20: within_limits(-30, 0) should be False"
    assert within_limits(30, -100), "shoulder 30 and elbow -100 are both inside their limits"


def test_every_box_gets_the_right_answer():
    show_boxes()
    for x, y, possible in BOXES:
        plan = plan_reach(x, y)
        if not possible:
            assert plan is None, f"Grabby can't reach ({x}, {y}) within its limits, but plan_reach returned {plan}"
            continue
        assert plan is not None, f"({x}, {y}) is reachable within the limits, but plan_reach returned None"
        assert within_limits(*plan), f"plan for ({x}, {y}) breaks a joint limit: {plan}"
        gx, gy = forward(*plan)
        assert math.hypot(gx - x, gy - y) < 0.01, f"gripper should be within 0.01 of ({x}, {y}), got ({gx:.2f}, {gy:.2f})"
