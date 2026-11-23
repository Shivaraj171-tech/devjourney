import math

from lab import viz

from kin.planar2 import frames_in_base, joint_link, tip_2link
from rigid.transform import translation_of

L1, L2 = 0.5, 0.4


def fmt(v):
    return "(" + ", ".join(f"{x:.3f}" for x in v) + ")"


def off(a, b):
    return max(abs(x - y) for x, y in zip(a, b))


def closed_form(q1, q2):
    """The textbook answer, by trigonometry: x = l1 cos q1 + l2 cos(q1 + q2), y = ..."""
    return (L1 * math.cos(q1) + L2 * math.cos(q1 + q2), L1 * math.sin(q1) + L2 * math.sin(q1 + q2), 0.0)


def test_draw_both_joints():
    frames = []
    for i in range(41):
        s = i / 40
        links = [joint_link(math.radians(60) * s, L1), joint_link(math.radians(-90) * s, L2)]
        frames.append(frames_in_base(links))
    tip = closed_form(math.radians(60), math.radians(-90))
    viz.arm3d(frames, local=False, axes=True, labels=["base", "elbow", "tip"], target=tip, name="two links",
              title="Two links, one transform per joint", points=[tip + ("where the tip must go",)],
              caption="Drawn from YOUR frames_in_base(): each frame must be in the BASE frame. Right: the tip meets the dashed target.")
    assert len(frames[-1]) == 2, "frames_in_base should return one frame per link"


def test_one_joint_link():
    T = joint_link(math.pi / 2, L1)
    assert off(translation_of(T), (0, L1, 0)) < 1e-9, "joint_link(90°, l) turns first, then walks l along the turned x axis: (0, l, 0)"


def test_the_elbow_is_where_link_one_ends():
    q1 = math.radians(30)
    frames = frames_in_base([joint_link(q1, L1), joint_link(math.radians(45), L2)])
    want = (L1 * math.cos(q1), L1 * math.sin(q1), 0.0)
    assert off(translation_of(frames[0]), want) < 1e-9, f"the elbow should be at {fmt(want)}, got {fmt(translation_of(frames[0]))}"


def test_the_tip_matches_the_textbook():
    for q1, q2 in [(0.0, 0.0), (math.radians(90), 0.0), (math.radians(30), math.radians(45)), (-1.2, 2.1)]:
        got = tip_2link(q1, q2, L1, L2)
        want = closed_form(q1, q2)
        assert off(got, want) < 1e-9, (
            f"q1 = {math.degrees(q1):.0f}°, q2 = {math.degrees(q2):.0f}°: the tip should be at {fmt(want)}, got {fmt(got)}. "
            "The second link's transform is in the ELBOW's frame: multiply it onto the first, T_0_2 = T_0_1 T_1_2")


def test_the_second_joint_is_relative():
    # Turning joint 1 swings the whole arm: the tip's angle is q1 + q2, not q2 alone.
    a = tip_2link(math.radians(90), math.radians(90), L1, L2)
    want = (-L2, L1, 0.0)
    assert off(a, want) < 1e-9, f"q1 = q2 = 90°: the forearm points along -x, the tip at {fmt(want)}, got {fmt(a)}"


def test_frames_are_rigid_transforms():
    for T in frames_in_base([joint_link(0.7, L1), joint_link(-0.3, L2)]):
        assert off(T[3], (0, 0, 0, 1)) < 1e-12, "every frame is a 4x4 homogeneous transform: bottom row [0, 0, 0, 1]"
