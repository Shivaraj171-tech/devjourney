import math

from lab import viz

from ik.two_link_ik import ik_2link
from ik.upright import upright_elbow, upright_links, upright_tip

TARGETS = [(0.6, 0.2), (0.3, 0.5), (-0.4, 0.3), (0.2, -0.6), (0.75, 0.0)]
FAR = (0.9 * math.cos(0.5), 0.9 * math.sin(0.5))  # the far box: exactly at full reach


def fmt(v):
    return "(" + ", ".join(f"{x:.3f}" for x in v) + ")"


def test_draw_both_elbows():
    poses, now = [], [0.0, 0.0]
    for target, elbow in ((TARGETS[0], "up"), (TARGETS[0], "down"), (FAR, "up")):
        q = ik_2link(*target, elbow=elbow)
        if q is None:
            continue
        poses += [[a + (b - a) * k / 20 for a, b in zip(now, q)] for k in range(21)]
        now = list(q)
    if not poses:
        poses = [[0.0, 0.0]]
    viz.arm3d([upright_links(q) for q in poses], axes=True, name="elbows", labels=["base", "upright", "elbow", "gripper"],
              points=[(TARGETS[0][0], 0.0, TARGETS[0][1], "box"), (FAR[0], 0.0, FAR[1], "far box")], trail=False,
              title="Two elbows, one box",
              caption="YOUR ik_2link: elbow up, then elbow down onto the same box, then stretched out to the far box.")
    assert poses


def test_both_elbows_reach_every_target():
    for target in TARGETS:
        for elbow in ("up", "down"):
            q = ik_2link(*target, elbow=elbow)
            assert q is not None, f"{target} is inside the ring: ik_2link must find the elbow-{elbow} solution"
            tip = upright_tip(q)
            got = (tip[0], tip[2])
            assert math.dist(got, target) < 1e-9, (
                f"elbow {elbow}, target {fmt(target)}: q = {fmt(q)} puts the gripper at {fmt(got)}. "
                "Does q1's correction use the same sign of sin(q2) as the elbow?")


def test_elbow_up_is_above_the_line():
    for target in TARGETS[:3]:
        q_up, q_down = ik_2link(*target, elbow="up"), ik_2link(*target, elbow="down")
        assert q_up[1] <= 0 <= q_down[1], f"elbow up has q2 <= 0, elbow down q2 >= 0; got {q_up[1]:.3f} and {q_down[1]:.3f}"
        # The elbow-up elbow sits higher (bigger z) than the elbow-down one, for a target in front.
        if target[0] > 0:
            assert upright_elbow(q_up)[2] > upright_elbow(q_down)[2], f"for {target} the 'up' elbow must be the higher one"


def test_the_far_box_at_full_reach():
    q = ik_2link(*FAR, elbow="up")
    assert q is not None, (
        f"{fmt(FAR)} is exactly at full reach (0.9 m): reachable, stretched out. ik_2link said None. "
        "Print c2: rounding makes it 1.0000000000000002")
    assert abs(q[1]) < 1e-6 and abs(q[0] - 0.5) < 1e-6, f"stretched out towards 0.5 rad: q = (0.5, 0), got {fmt(q)}"


def test_out_of_reach_is_none():
    assert ik_2link(1.0, 0.0) is None, "1 m away is beyond l1 + l2 = 0.9: None"
    assert ik_2link(0.05, 0.0) is None, "0.05 m away is inside |l1 - l2| = 0.1: None"
