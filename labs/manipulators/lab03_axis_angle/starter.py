"""Lab 03: axis-angle, Rodrigues' formula, exp and log on SO(3)."""

from __future__ import annotations

import numpy as np

from labs.manipulators.toolbox import skew, vee  # noqa: F401  (reference lab01 helpers)

SMALL = 1e-9


def rodrigues(axis, theta: float) -> np.ndarray:
    """R = I + sin(theta) [k] + (1 - cos(theta)) [k]^2 for unit axis k.

    Normalise ``axis`` first; raise ValueError for a zero axis.
    """
    # TODO
    raise NotImplementedError("Rodrigues' formula")


def exp_so3(omega) -> np.ndarray:
    """exp([omega]) for a rotation vector omega = axis * angle."""
    # TODO: theta = |omega|. If theta is tiny, return I + [omega] (why is that accurate?).
    raise NotImplementedError("matrix exponential on SO(3)")


def log_so3(R) -> np.ndarray:
    """Rotation vector omega (angle in [0, pi]) with exp_so3(omega) == R.

    Three regimes (see README step 5): theta ~ 0, generic, theta ~ pi.
    """
    # TODO: theta = arccos(clip((trace(R) - 1) / 2, -1, 1)), then branch.
    raise NotImplementedError("matrix logarithm on SO(3)")


def axis_angle_from_matrix(R):
    """(unit axis, angle) with angle in [0, pi]. Return axis (1, 0, 0) for the identity."""
    # TODO: use log_so3.
    raise NotImplementedError("split the rotation vector into axis and angle")
