import math

from lab import viz

from grabby.arm import FOREARM, UPPER_ARM, forward


def close_to(got, want, tolerance=0.01):
    return abs(got[0] - want[0]) <= tolerance and abs(got[1] - want[1]) <= tolerance


def show(name, shoulder_deg, elbow_deg):
    """Draw the REAL arm sweeping to this pose, with a cross where forward() says the gripper is."""
    frames, ghost = [], []
    for i in range(31):
        s, e = shoulder_deg * i / 30, elbow_deg * i / 30
        frames.append([math.radians(s), math.radians(e)])
        ghost.append(forward(s, e))
    viz.arm(frames, (UPPER_ARM, FOREARM), name=name, title=f"forward({shoulder_deg}, {elbow_deg})", ghost=ghost,
            caption="The arm is drawn from the real geometry. The pink cross is what your forward() says.")


def test_straight_arm_points_along_x():
    got = forward(0, 0)
    assert close_to(got, (1.8, 0.0)), f"a straight arm at 0 degrees should reach (1.80, 0.00), got ({got[0]:.2f}, {got[1]:.2f})"


def test_shoulder_flat_elbow_bent_up():
    got = forward(0, 90)
    assert close_to(got, (1.0, 0.8)), f"gripper should be within 0.01 of (1.00, 0.80), got ({got[0]:.2f}, {got[1]:.2f})"


def test_shoulder_up_arm_straight():
    show("shoulder up", 90, 0)
    got = forward(90, 0)
    assert close_to(got, (0.0, 1.8)), f"gripper should be within 0.01 of (0.00, 1.80), got ({got[0]:.2f}, {got[1]:.2f})"


def test_both_joints_bent():
    show("both bent", 90, 90)
    got = forward(90, 90)
    # The forearm points along 90 + 90 = 180 degrees: straight back to the left.
    assert close_to(got, (-0.8, 1.0)), f"gripper should be within 0.01 of (-0.80, 1.00), got ({got[0]:.2f}, {got[1]:.2f})"
