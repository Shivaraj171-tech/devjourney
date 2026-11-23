import math
import random

from lab import viz

from kin.arm3_dh import ARM3_DH, arm3_frames
from kin.rrr import A2, A3, D1, rrr_fk, rrr_links
from rigid.frames import chain
from rigid.transform import translation_of


def fmt(v):
    return "(" + ", ".join(f"{x:.3f}" for x in v) + ")"


def off(a, b):
    return max(abs(x - y) for x, y in zip(a, b))


def flat(T):
    return [T[i][j] for i in range(3) for j in range(4)]


def random_poses(n=6):
    rng = random.Random(5)
    return [[rng.uniform(-math.pi, math.pi) for _ in range(3)] for _ in range(n)]


def test_draw_your_table():
    goal_q = (math.radians(-50), math.radians(40), math.radians(-70))
    frames = []
    for i in range(41):
        s = i / 40
        frames.append(arm3_frames([a * s for a in goal_q])[1:])
    goal = translation_of(rrr_fk(*goal_q))
    viz.arm3d(frames, local=False, axes=True, labels=["base", "frame 1", "frame 2", "frame 3 (wrist)"], target=goal,
              name="arm3 dh", title="Your DH table, drawn", points=[tuple(goal) + ("ticket 3's wrist",)],
              caption="Every frame comes from YOUR ARM3_DH. Right: frame 1's z (blue) lies flat, along the shoulder's axis, and the wrist meets ticket 3's answer.")
    assert len(ARM3_DH) == 3, f"the 3-DOF arm has 3 joints, so 3 rows, got {len(ARM3_DH)}"


def test_home_pose():
    got = translation_of(arm3_frames([0, 0, 0])[-1])
    want = (A2 + A3, 0.0, D1)
    assert off(got, want) < 1e-9, f"at home the wrist is straight out at {fmt(want)}, got {fmt(got)}"


def test_joint_2_axis_is_horizontal():
    for q1 in (0.0, 0.6, 2.0):
        z1 = [row[2] for row in arm3_frames([q1, 0.3, 0.2])[1][:3]]
        want = (math.sin(q1), -math.cos(q1), 0.0)
        assert off(z1, want) < 1e-9, (
            f"frame 1's z axis is the SHOULDER's joint axis: horizontal, {fmt(want)} for q1 = {math.degrees(q1):.0f}°, got {fmt(z1)}. "
            "Which DH parameter twists z0 (vertical) into z1 (horizontal)?")


def test_elbow_frame_matches_ticket_3():
    for q in random_poses(4):
        got = translation_of(arm3_frames(q)[2])
        want = translation_of(chain(*rrr_links(*q)[:2]))
        assert off(got, want) < 1e-9, f"frame 2 (the elbow) should be at {fmt(want)}, got {fmt(got)}: where does the upper arm's length go?"


def test_same_pose_as_ticket_3():
    for q in random_poses():
        got, want = arm3_frames(q)[-1], rrr_fk(*q)
        assert off(flat(got), flat(want)) < 1e-9, (
            f"q = ({', '.join(f'{math.degrees(a):.0f}°' for a in q)}): your table's wrist pose should equal rrr_fk's, "
            f"position {fmt(translation_of(want))}, got {fmt(translation_of(got))}")
