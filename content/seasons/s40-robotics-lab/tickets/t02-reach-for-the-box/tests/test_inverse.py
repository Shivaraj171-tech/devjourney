import math

from lab import viz

from grabby.arm import FOREARM, UPPER_ARM, forward
from grabby.ik import inverse

SHELF = [(1.2, 0.5), (0.0, 1.5), (-0.9, 0.9), (-1.2, -0.4)]


def reach_error(x, y, elbow="down"):
    """How far from (x, y) the gripper ends up, using inverse() then forward()."""
    shoulder, bend = inverse(x, y, elbow)
    gx, gy = forward(shoulder, bend)
    return math.hypot(gx - x, gy - y), (gx, gy)


def show_shelf():
    """Animate Grabby reaching for every box on the shelf, one after another."""
    frames, targets = [], []
    pose = [0.0, 0.0]
    for x, y in SHELF:
        try:
            goal = [math.radians(a) for a in inverse(x, y)]
        except Exception:  # your inverse() crashed for this box: the arm stays put
            goal = pose
        for i in range(1, 21):
            frames.append([pose[j] + (goal[j] - pose[j]) * i / 20 for j in range(2)])
            targets.append((x, y))
        pose = goal
    viz.arm(frames, (UPPER_ARM, FOREARM), name="shelf", title="Reaching for each box on the shelf", targets=targets)


def test_reaches_a_box_in_front():
    error, got = reach_error(1.2, 0.5)
    assert error < 0.01, f"gripper should be within 0.01 of (1.20, 0.50), got ({got[0]:.2f}, {got[1]:.2f})"


def test_reaches_a_box_straight_ahead():
    error, got = reach_error(0.0, 1.5)
    assert error < 0.01, f"gripper should be within 0.01 of (0.00, 1.50), got ({got[0]:.2f}, {got[1]:.2f})"


def test_reaches_every_box_on_the_shelf():
    show_shelf()
    for x, y in SHELF:
        error, got = reach_error(x, y)
        assert error < 0.01, f"gripper should be within 0.01 of ({x:.2f}, {y:.2f}), got ({got[0]:.2f}, {got[1]:.2f})"


def test_elbow_up_and_down_both_reach():
    down = inverse(1.0, 1.0, "down")
    up = inverse(1.0, 1.0, "up")
    assert down[1] >= 0 and up[1] <= 0, f"elbow 'down' bends anticlockwise (>= 0), 'up' clockwise (<= 0), got {down[1]:.1f} and {up[1]:.1f}"
    for elbow in ["down", "up"]:
        error, got = reach_error(1.0, 1.0, elbow)
        assert error < 0.01, f"elbow {elbow!r}: gripper should be within 0.01 of (1.00, 1.00), got ({got[0]:.2f}, {got[1]:.2f})"
