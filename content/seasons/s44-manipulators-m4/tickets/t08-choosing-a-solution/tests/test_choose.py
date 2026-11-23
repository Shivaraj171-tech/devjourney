import math

from lab import viz

from ik.choose import joint_distance, pick_solution, within_limits
from ik.rrr_ik import rrr_ik, rrr_ik_all
from kin.rrr import rrr_links
from rigid.frames import chain
from rigid.transform import translation_of

BOX = (0.3, 0.4, 0.5)
Q_NOW = [0.9, -0.1, 1.2]  # Grabby is just above the box, elbow down
LIMITS = [(-math.pi, math.pi), (-0.5, 2.0), (-2.6, 2.6)]  # the shoulder can't swing far back


def fmt(v):
    return "(" + ", ".join(f"{x:.2f}" for x in v) + ")"


def elbow(q):
    return translation_of(chain(*rrr_links(*q)[:2]))


def test_draw_the_shortest_move():
    names = ["front, elbow up", "front, elbow down", "back, elbow up", "back, elbow down"]
    sols = rrr_ik_all(BOX)
    pick = pick_solution(sols, Q_NOW, LIMITS) or Q_NOW
    poses = [[a + (b - a) * k / 30 for a, b in zip(Q_NOW, pick)] for k in range(31)]
    marks = [tuple(elbow(q)) + (f"{n}: {joint_distance(q, Q_NOW):.2f} rad" + ("" if within_limits(q, LIMITS) else " (limits!)"),)
             for n, q in zip(names, sols)]
    viz.arm3d([rrr_links(*q) for q in poses], axes=True, name="choose", target=BOX, points=marks,
              labels=["base", "frame 1", "elbow", "wrist"], title="Four solutions, one move",
              caption="Dots: the elbow of each IK solution, with its joint distance from where the arm is now. YOUR pick_solution decides which one the arm goes to.")
    assert len(sols) == 4


def test_within_limits_checks_both_ends():
    assert within_limits([0.0, 1.0, 0.0], LIMITS)
    assert not within_limits([0.0, -0.8, 0.0], LIMITS), "q2 = -0.8 is below its lower limit -0.5"
    assert not within_limits([0.0, 2.2, 0.0], LIMITS), "q2 = 2.2 is ABOVE its upper limit 2.0: a joint has two ends"


def test_joint_distance_is_a_length():
    assert abs(joint_distance([0.0, 0.0], [0.3, -0.4]) - 0.5) < 1e-12, "sqrt(0.3² + 0.4²) = 0.5"
    assert joint_distance([1.0, 2.0], [0.0, 3.0]) > 0, (
        "moving joint 1 by -1 and joint 2 by +1 is NOT zero travel: differences of opposite signs must not cancel")


def test_picks_the_closest_allowed_solution():
    sols = rrr_ik_all(BOX)
    got = pick_solution(sols, Q_NOW, LIMITS)
    want = rrr_ik(BOX, "down", True)
    assert got is not None and max(abs(a - b) for a, b in zip(got, want)) < 1e-9, (
        f"the arm is at {fmt(Q_NOW)}, right next to the front elbow-down solution {fmt(want)} "
        f"({joint_distance(want, Q_NOW):.2f} rad away). pick_solution chose {fmt(got) if got else None}")


def test_nothing_allowed_is_none():
    assert pick_solution(rrr_ik_all(BOX), Q_NOW, [(-0.1, 0.1)] * 3) is None, "no solution within these tight limits: None"
