import math

from lab import viz

from ik.rrr_ik import rrr_ik, rrr_ik_all
from kin.rrr import rrr_fk, rrr_links
from rigid.transform import translation_of

BOX = (0.3, 0.4, 0.5)
TARGETS = [BOX, (0.5, -0.2, 0.1), (-0.3, 0.1, 0.6), (0.1, 0.55, 0.3)]


def fmt(v):
    return "(" + ", ".join(f"{x:.3f}" for x in v) + ")"


def wrist(q):
    return translation_of(rrr_fk(*q))


def test_draw_four_ways_to_one_box():
    sols = rrr_ik_all(BOX) or [[0.0, 0.0, 0.0]]
    poses, now = [], [0.0, 0.0, 0.0]
    for q in sols:
        poses += [[a + (b - a) * k / 15 for a, b in zip(now, q)] for k in range(16)]
        now = q
    viz.arm3d([rrr_links(*q) for q in poses], axes=True, name="four", target=BOX, trail=False,
              labels=["base", "frame 1", "elbow", "wrist"], title="Four ways to reach one box",
              caption="YOUR rrr_ik_all, one solution after another: front elbow up, front elbow down, then over the back, both elbows.")
    assert sols


def test_every_solution_reaches_the_target():
    for p in TARGETS:
        for front in (True, False):
            for elbow in ("up", "down"):
                q = rrr_ik(p, elbow, front)
                assert q is not None, f"{fmt(p)} is within reach: rrr_ik(elbow={elbow!r}, front={front}) must find it"
                got = wrist(q)
                assert math.dist(got, p) < 1e-9, (
                    f"rrr_ik({fmt(p)}, {elbow!r}, front={front}) = {fmt(q)} puts the wrist at {fmt(got)} "
                    f"({math.dist(got, p) * 100:.1f} cm off). Measured from where is the in-plane height?")


def test_four_different_solutions():
    sols = rrr_ik_all(BOX)
    assert len(sols) == 4, f"the box is reachable 4 ways (2 base turns x 2 elbows), got {len(sols)}"
    for i in range(4):
        for j in range(i + 1, 4):
            assert max(abs(a - b) for a, b in zip(sols[i], sols[j])) > 0.1, f"solutions {i} and {j} are the same: {fmt(sols[i])}"


def test_base_angle_points_at_the_target():
    q = rrr_ik(BOX, "up", True)
    assert q is not None, f"{fmt(BOX)} is 0.5 m from the base and 0.2 m above the shoulder: well within reach, got None"
    assert abs(q[0] - math.atan2(BOX[1], BOX[0])) < 1e-12, f"the base turns the arm's plane onto the box: q1 = atan2(y, x), got {q[0]:.4f}"


def test_out_of_reach():
    assert rrr_ik((0.0, 0.0, 1.5)) is None, "1.2 m above the shoulder: the arm (0.7 m) can't reach"
    assert rrr_ik_all((2.0, 0.0, 0.0)) == [], "2 m away: no solutions at all"
