import math

from lab import viz

from kin.joints import joint_transform, mobility, trans
from rigid.transform import T_mul, rotation_of, translation_of


def fmt(v):
    return "(" + ", ".join(f"{x:.2f}" for x in v) + ")"


def off(a, b):
    return max(abs(x - y) for x, y in zip(a, b))


def lift_arm(q1, q2, q3):
    """Grabby's test rig, link by link: a turntable (R), a lift (P), an arm out to a wrist roll (R)."""
    return [
        joint_transform("revolute", (0, 0, 1), q1),                                   # turntable about z
        T_mul(trans(0.0, 0.0, 0.25), joint_transform("prismatic", (0, 0, 1), q2)),   # column, then the lift
        T_mul(trans(0.35, 0.0, 0.0), joint_transform("revolute", (1, 0, 0), q3)),    # arm out, wrist roll
        trans(0.10, 0.0, 0.0),                                                        # out to the fingertips
    ]


def tip(links):
    T = links[0]
    for L in links[1:]:
        T = T_mul(T, L)
    return translation_of(T)


def test_draw_the_rig():
    frames = []
    for i in range(41):
        s = i / 40
        frames.append(lift_arm(math.pi / 2 * s, 0.2 * s, math.pi / 2 * s))
    viz.arm3d(frames, axes=True, labels=["base", "turntable (R)", "lift (P)", "wrist roll (R)", "gripper"],
              name="rig", title="R-P-R: turn, lift, roll",
              caption="A triad on every joint frame. The turntable turns, the lift slides 0.20 m up, the wrist rolls.")
    assert len(frames[0]) == 4


def test_revolute_turns_about_its_axis():
    T = joint_transform("revolute", (0, 0, 1), math.pi / 2)
    x_axis = [row[0] for row in rotation_of(T)]
    assert off(x_axis, (0, 1, 0)) < 1e-9, f"a quarter turn about z should send x to (0, 1, 0), got {fmt(x_axis)}"
    assert off(translation_of(T), (0, 0, 0)) < 1e-9, "a revolute joint turns in place: no translation"


def test_prismatic_slides_along_its_axis():
    T = joint_transform("prismatic", (0, 0, 2), 0.3)
    moved = translation_of(T)
    assert off(moved, (0, 0, 0.3)) < 1e-9, (
        f"a prismatic joint slides q = 0.30 m along its (unit) axis: expected (0.00, 0.00, 0.30), got {fmt(moved)}. "
        "It is a pure move: no turn at all")
    R = rotation_of(T)
    assert off([R[i][j] for i in range(3) for j in range(3)], [1, 0, 0, 0, 1, 0, 0, 0, 1]) < 1e-9, (
        "a prismatic joint must not turn anything: its rotation is the identity")


def test_the_lift_raises_the_gripper():
    got = tip(lift_arm(0.0, 0.2, 0.0))
    assert off(got, (0.45, 0.0, 0.45)) < 1e-9, (
        f"with the lift out 0.20 m the gripper should be at (0.45, 0.00, 0.45), got {fmt(got)}: "
        "is the lift sliding, or turning?")


def test_unknown_joint_kinds_are_refused():
    try:
        joint_transform("ball", (0, 0, 1), 0.1)
    except ValueError:
        return
    assert False, "joint_transform('ball', ...) should raise ValueError: only 'revolute' and 'prismatic' exist here"


def test_mobility_of_open_chains():
    six = mobility(7, [1] * 6)
    assert six == 6, (f"a 6-joint arm (7 links counting the ground) has 6 DOF, got {six}. "
                      "Grübler: 6 (N - 1 - J) + sum(f), and the ground counts as a link that never moves")
    assert mobility(3, [1, 1], spatial=False) == 2, "a planar 2-link arm (3 links with the ground) has 2 DOF"
    assert mobility(8, [1] * 7) == 7, "a 7-joint arm has 7 DOF: one more than it needs (redundant)"


def test_mobility_of_a_closed_loop():
    four_bar = mobility(4, [1, 1, 1, 1], spatial=False)
    assert four_bar == 1, (f"a planar four-bar linkage (4 links incl. the ground, 4 hinges) has 1 DOF, got {four_bar}: "
                           "closing the loop takes freedoms away")
