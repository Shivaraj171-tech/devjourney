import math

from lab import viz

from kin.joints import trans
from kin.planar2 import frames_in_base, joint_link
from kin.poe import exp_twist, fk_poe, revolute_screw
from kin.rrr import A2, A3, D1, rrr_fk, rrr_links
from rigid.frames import chain
from rigid.rotations import is_rotation
from rigid.transform import rotation_of, translation_of


def fmt(v):
    return "(" + ", ".join(f"{x:.3f}" for x in v) + ")"


def flat(T):
    return [T[i][j] for i in range(3) for j in range(4)]


def off(a, b):
    return max(abs(x - y) for x, y in zip(a, b))


# Ticket 3's arm, as screws: each joint's axis at HOME (every joint at 0), in the base frame.
SCREWS = [
    revolute_screw((0, 0, 1), (0, 0, 0)),     # yaw: vertical, through the base
    revolute_screw((0, -1, 0), (0, 0, D1)),   # shoulder: horizontal, through the shoulder
    revolute_screw((0, -1, 0), (A2, 0, D1)),  # elbow: horizontal, through the elbow
]
HOME_FRAMES = [chain(*rrr_links(0, 0, 0)[:k + 1]) for k in range(3)]  # M_1, M_2, M_3


def poe_frames(q):
    """Each joint's frame by PoE: T_0_k(q) = e^[S1]q1 ... e^[Sk]qk M_k."""
    return [fk_poe(HOME_FRAMES[k], SCREWS[:k + 1], q[:k + 1]) for k in range(3)]


def test_draw_the_arm_by_screws():
    goal_q = [math.radians(70), math.radians(35), math.radians(-80)]
    frames = [poe_frames([a * i / 40 for a in goal_q]) for i in range(41)]
    axes = [((0, 0, 0), (0, 0, 0.6)), ((0, -0.25, D1), (0, 0.25, D1)), ((A2, -0.25, D1), (A2, 0.25, D1))]
    goal = translation_of(rrr_fk(*goal_q))
    viz.arm3d(frames, local=False, axes=True, labels=["base", "shoulder", "elbow", "wrist"], lines=axes, target=goal,
              name="poe", title="Ticket 3's arm, by the product of exponentials",
              caption="Grey: the screw axes at home. Frames from YOUR exp_twist. Right: the wrist lands on ticket 3's answer.")
    assert len(frames) == 41


def test_zero_angle_is_no_motion():
    T = exp_twist(revolute_screw((0, 0, 1), (1, 2, 0)), 0.0)
    assert off(flat(T), flat(trans(0, 0, 0))) < 1e-12, "e^([S] 0) is the identity: no motion"


def test_a_prismatic_twist_is_a_slide():
    T = exp_twist([0, 0, 0, 0, 0, 1], 0.25)
    assert off(translation_of(T), (0, 0, 0.25)) < 1e-12, "omega = 0, v = z: slide 0.25 m up"


def test_a_screw_has_omega_and_v():
    S = revolute_screw((0, 0, 1), (1, 0, 0))
    assert off(S, (0, 0, 1, 0, -1, 0)) < 1e-12, f"axis z through (1, 0, 0): S = (omega, -omega x q) = (0, 0, 1, 0, -1, 0), got {S}"


def test_turning_about_an_axis_that_misses_the_origin():
    # A quarter turn about the vertical line through (1, 0, 0): the origin swings round to (1, -1, 0).
    T = exp_twist(revolute_screw((0, 0, 1), (1, 0, 0)), math.pi / 2)
    got = translation_of(T)
    assert off(got, (1, -1, 0)) < 1e-9, (
        f"turning 90° about the vertical axis through (1, 0, 0) carries the origin to (1.000, -1.000, 0.000), got {fmt(got)}. "
        "The translation is G(theta) v, not v theta: v theta is only right for a slide")
    assert is_rotation(rotation_of(T)), "the rotation part must be a proper rotation"


def test_points_on_the_axis_stay_put():
    T = exp_twist(revolute_screw((0, 0, 1), (1, 0, 0)), 2.0)
    p = [sum(T[i][k] * c for k, c in enumerate((1, 0, 0.5, 1))) for i in range(3)]
    assert off(p, (1, 0, 0.5)) < 1e-9, f"a point ON the screw axis doesn't move when you turn about it, got {fmt(p)}"


def test_poe_agrees_with_composition_on_the_two_link_arm():
    l1, l2 = 0.5, 0.4
    M = trans(l1 + l2, 0, 0)
    screws = [revolute_screw((0, 0, 1), (0, 0, 0)), revolute_screw((0, 0, 1), (l1, 0, 0))]
    for q in [(0.3, 0.4), (1.2, -2.0), (-0.7, 2.6)]:
        want = frames_in_base([joint_link(q[0], l1), joint_link(q[1], l2)])[-1]
        got = fk_poe(M, screws, q)
        assert off(flat(got), flat(want)) < 1e-9, (
            f"q = {q}: PoE should give the same tip as ticket 2's chain, {fmt(translation_of(want))}, got {fmt(translation_of(got))}")


def test_poe_agrees_with_ticket_3():
    for q in [(0.5, 0.3, -0.6), (-2.0, 1.0, 1.4), (3.0, -0.4, 2.2)]:
        got, want = poe_frames(list(q))[-1], rrr_fk(*q)
        assert off(flat(got), flat(want)) < 1e-9, f"q = {q}: PoE wrist {fmt(translation_of(got))}, ticket 3 says {fmt(translation_of(want))}"
