import math

from lab import viz

from grabby.arm import FOREARM, UPPER_ARM, forward
from grabby.joint_sim import DT, simulate
from grabby.pid import KD, KI, KP, new_controller, pid_step

TARGET = 90.0
ELBOW = 30.0  # the elbow holds still while the shoulder moves

_cache = {}


def run():
    """The shoulder's angle every tick for 5 seconds, moving from 0 to 90 degrees (simulated once)."""
    if "angles" not in _cache:
        angles = simulate(TARGET)
        _cache["angles"] = angles
        times = [round((i + 1) * DT, 2) for i in range(len(angles))]
        viz.chart("Shoulder angle", times, angles, label="shoulder", x_label="seconds", y_label="degrees", hline=TARGET)
        shown = [a if math.isfinite(a) else 0.0 for a in angles[::5]]
        viz.arm([[math.radians(a), math.radians(ELBOW)] for a in shown], (UPPER_ARM, FOREARM), name="arm",
                title="The shoulder swinging up to 90°", target=forward(TARGET, ELBOW))
    return _cache["angles"]


def test_braking_term_pushes_against_closing_in():
    state = new_controller()
    pid_step(state, 90.0, 80.0, 0.01)  # error 10
    torque = pid_step(state, 90.0, 82.0, 0.01)  # error 8: closing in fast
    without_d = KP * 8.0 + KI * state["integral"]
    assert torque < without_d, (
        f"the error shrank from 10 to 8 in one tick, so D should BRAKE (lower the torque below {without_d:.1f}), "
        f"got {torque:.1f}")


def test_overshoot_is_under_5_percent():
    peak = max(run())
    assert peak <= TARGET * 1.05, f"the shoulder should never go past {TARGET * 1.05:.1f} degrees (5% overshoot), it peaked at {peak:.1f}"


def test_settles_within_2_5_seconds():
    angles = run()
    late = angles[int(2.5 / DT):]
    worst = max(abs(a - TARGET) for a in late)
    assert worst < 1.0, f"after 2.5 s the shoulder should stay within 1 degree of {TARGET}, but it was {worst:.1f} degrees off"


def test_ends_on_target():
    final = run()[-1]
    assert abs(final - TARGET) < 0.5, f"after 5 s the shoulder should be within 0.5 degrees of {TARGET}, got {final:.2f}"
