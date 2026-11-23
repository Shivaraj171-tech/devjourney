import math

from lab import viz

from kin.ur5 import ur5_frames
from vel.monitor import KAPPA_SLOW, KAPPA_STOP, condition_number, guard, joint_speeds, singular_values
from vel.ur5j import ur5_jacobian

BASE = [0.4, -1.2, 1.6, -1.9, 0.6, 0.3]   # the incident's pose, q5 = 0.6 rad
SPIN = [0.0, 0.0, 0.0, 0.0, 0.0, 0.2]     # the planner's command: turn the box about the vertical, 0.2 rad/s
LABELS = ["base", "frame 1", "frame 2", "3", "4", "5", "flange"]


def at_q5(deg):
    q = list(BASE)
    q[4] = math.radians(deg)
    return q


def test_draw_the_wrist_tilting():
    degs = [40 - 39 * k / 39 for k in range(40)]  # q5 from 40 deg down to 1 deg
    frames, arrows, kappas, q4dot, q6dot = [], [], [], [], []
    for d in degs:
        q = at_q5(d)
        F = ur5_frames(q)
        J = ur5_jacobian(q)
        qdot = joint_speeds(J, SPIN)
        frames.append(F[1:])
        p = [F[-1][i][3] for i in range(3)]
        arrows.append([{"start": p, "vec": [0.0, 0.0, 0.5], "label": "spin axis (0.2 rad/s)"}])
        kappas.append(condition_number(J))
        q4dot.append(qdot[3])
        q6dot.append(qdot[5])
    viz.arm3d(frames, local=False, axes=True, arrows=arrows, name="wrist", scale=0.07, labels=LABELS,
              title="Grabby-6's wrist tilting towards q5 = 0",
              caption="The same gentle spin, asked of a wrist closer and closer to its flip.")
    viz.chart("Condition number (YOUR monitor)", degs, kappas, label="kappa", x_label="q5 (deg)", y_label="kappa", log=True, hline=KAPPA_STOP)
    viz.chart("Joint speeds for the same spin", degs, q4dot, label="joint 4", x_label="q5 (deg)", y_label="rad/s")
    viz.chart("Joint speeds for the same spin", degs, q6dot, label="joint 6")
    assert len(frames) == 40


def test_singular_values_of_a_known_matrix():
    s = singular_values([[3.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 2.0]])
    assert max(abs(a - b) for a, b in zip(s, [3.0, 2.0, 1.0])) < 1e-9, (
        f"diag(3, 1, 2) stretches by 3, 1 and 2: its singular values are [3, 2, 1], got {[round(x, 4) for x in s]}. "
        "J^T J's eigenvalues are sigma SQUARED")
    assert abs(condition_number([[10.0, 0.0], [0.0, 1.0]]) - 10.0) < 1e-9, "diag(10, 1): kappa = 10"


def test_far_from_the_flip_it_keeps_going():
    for d in (28, 20, 10):
        action, kappa = guard(ur5_jacobian(at_q5(d)))
        assert action == "go", (
            f"at q5 = {d} deg the wrist is nowhere near its flip (the joints need under 1.4 rad/s), but the monitor says "
            f"{action!r} with kappa = {kappa:.0f}. The real sigma_max / sigma_min there is under {KAPPA_SLOW:.0f}")


def test_near_the_flip_it_slows_then_stops():
    assert guard(ur5_jacobian(at_q5(5)))[0] == "slow", "at q5 = 5 deg kappa is about 74: slow down"
    action, kappa = guard(ur5_jacobian(at_q5(1)))
    assert action == "stop", f"at q5 = 1 deg kappa is about 366 and joint 4 would need 14 rad/s: stop. Got {action!r} ({kappa:.0f})"
    assert abs(kappa - 366.19) < 0.5, f"kappa at q5 = 1 deg should be 366.2, got {kappa:.1f}"


def test_speeds_explode_near_the_flip():
    slow = joint_speeds(ur5_jacobian(at_q5(30)), SPIN)
    fast = joint_speeds(ur5_jacobian(at_q5(1)), SPIN)
    assert abs(slow[3]) < 0.5 and abs(fast[3]) > 10, (
        f"the same spin needs joint 4 at {slow[3]:.2f} rad/s at q5 = 30 deg but {fast[3]:.2f} rad/s at q5 = 1 deg")
