import math

from lab import viz

from kin.rrr import A2, A3, D1, rrr_fk, rrr_links
from rigid.frames import chain
from rigid.transform import translation_of


def fmt(v):
    return "(" + ", ".join(f"{x:.3f}" for x in v) + ")"


def off(a, b):
    return max(abs(x - y) for x, y in zip(a, b))


def by_geometry(q1, q2, q3):
    """The wrist by plain geometry: reach r in the arm's vertical plane, then turn that plane by q1."""
    r = A2 * math.cos(q2) + A3 * math.cos(q2 + q3)
    return (math.cos(q1) * r, math.sin(q1) * r, D1 + A2 * math.sin(q2) + A3 * math.sin(q2 + q3))


POSES = [(0.0, 0.0, 0.0), (math.radians(90), 0.0, 0.0), (0.0, math.radians(90), 0.0),
         (math.radians(40), math.radians(30), math.radians(-60)), (-2.0, 0.9, 1.1)]


def test_draw_the_arm():
    target = (math.radians(40), math.radians(30), math.radians(-60))
    frames = []
    for i in range(41):
        s = i / 40
        q = [a * s for a in target]
        links = rrr_links(*q)
        world = [chain(*links[:k + 1]) for k in range(len(links) - 1)] + [rrr_fk(*q)]
        frames.append(world)
    goal = by_geometry(*target)
    viz.arm3d(frames, local=False, axes=True, labels=["base", "shoulder", "elbow", "wrist"], target=goal, name="rrr",
              title="Three joints: yaw, shoulder, elbow", points=[goal + ("wrist must be here",)],
              caption="The wrist is drawn from YOUR rrr_fk(); the shoulder and elbow from the links. Right: the wrist lands on the target and the arm is in one piece.")
    assert len(frames) == 41


def test_home_pose():
    got = translation_of(rrr_fk(0.0, 0.0, 0.0))
    assert off(got, (A2 + A3, 0.0, D1)) < 1e-9, f"at home the wrist is straight out: {fmt((A2 + A3, 0.0, D1))}, got {fmt(got)}"


def test_wrist_matches_the_geometry():
    for q in POSES:
        got = translation_of(rrr_fk(*q))
        want = by_geometry(*q)
        assert off(got, want) < 1e-9, (
            f"q = ({', '.join(f'{math.degrees(a):.0f}°' for a in q)}): the wrist should be at {fmt(want)}, got {fmt(got)} "
            f"({off(got, want) * 100:.1f} cm off). Multiply from the base outwards: T_0_1 T_1_2 T_2_3")


def test_yaw_swings_the_whole_arm():
    got = translation_of(rrr_fk(math.radians(90), math.radians(30), 0.0))
    want = by_geometry(math.radians(90), math.radians(30), 0.0)
    assert off(got, want) < 1e-9, f"yaw 90° must swing the whole arm round to {fmt(want)}, got {fmt(got)}"


def test_shoulder_lifts_the_forearm_too():
    got = translation_of(rrr_fk(0.0, math.radians(90), 0.0))
    assert off(got, (0.0, 0.0, D1 + A2 + A3)) < 1e-9, f"shoulder at 90° points the whole arm straight up, got {fmt(got)}"


def test_the_wrist_frame_follows_the_forearm():
    q = (0.3, 0.4, 0.5)
    x_axis = [row[0] for row in rrr_fk(*q)[:3]]
    want = (math.cos(q[0]) * math.cos(q[1] + q[2]), math.sin(q[0]) * math.cos(q[1] + q[2]), math.sin(q[1] + q[2]))
    assert off(x_axis, want) < 1e-9, f"the wrist's x axis points along the forearm, {fmt(want)}, got {fmt(x_axis)}"
