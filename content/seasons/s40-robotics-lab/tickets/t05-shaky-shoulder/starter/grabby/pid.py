"""Grabby's joint controller: a PID loop that turns "where I want to be" into motor torque.

Every tick (dt seconds) the controller looks at the error, target - measured, and adds
three pushes together:
  P: push towards the target, harder the further away it is      (KP * error)
  I: push a bit more if we've been short for a while              (KI * integral)
  D: brake when the error is shrinking fast, so we don't overshoot (KD * derivative)
"""
from grabby.limits import clamp

KP = 40.0
KI = 10.0
KD = 10.0
INTEGRAL_LIMIT = 1.5  # degree-seconds: stops the I part from piling up ("wind-up")


def new_controller():
    """A fresh controller's memory: nothing summed up yet, no previous error."""
    return {"integral": 0.0, "prev_error": None}


def pid_step(state, target, measured, dt):
    """The torque to send this tick. Updates `state` (the controller's memory)."""
    error = target - measured
    state["integral"] = clamp(state["integral"] + error * dt, -INTEGRAL_LIMIT, INTEGRAL_LIMIT)
    if state["prev_error"] is None:
        derivative = 0.0
    else:
        # How fast the error is changing: negative while we close in, so D brakes.
        derivative = (state["prev_error"] - error) / dt
    state["prev_error"] = error
    return KP * error + KI * state["integral"] + KD * derivative
