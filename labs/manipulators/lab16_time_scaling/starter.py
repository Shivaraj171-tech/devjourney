"""Lab 16: time scaling: cubic and quintic polynomials, trapezoidal velocity profiles.

Every *_scaling(t, T) returns (s, ds/dt, d2s/dt2) and holds s constant (0 before, 1 after,
derivatives 0) outside [0, T].
"""

from __future__ import annotations

import numpy as np

# TODO: (peak |ds/dt| * T, peak |d2s/dt2| * T^2) of the rest-to-rest polynomials (README step 3)
CUBIC_PEAKS = (None, None)
QUINTIC_PEAKS = (None, None)


def cubic_coefficients(x0, x1, v0, v1, T):
    """[a0, a1, a2, a3] with x(0) = x0, x'(0) = v0, x(T) = x1, x'(T) = v1 (README step 1)."""
    # TODO
    raise NotImplementedError("cubic coefficients")


def quintic_coefficients(x0, x1, v0, v1, a0, a1, T):
    """[c0, ..., c5] matching x, x', x'' at t = 0 and t = T: build the 6x6 system, np.linalg.solve."""
    # TODO: README step 2
    raise NotImplementedError("quintic coefficients")


def cubic_scaling(t, T):
    """s = 3 tau^2 - 2 tau^3 and its first two time derivatives."""
    # TODO
    raise NotImplementedError("cubic time scaling")


def quintic_scaling(t, T):
    """s = 10 tau^3 - 15 tau^4 + 6 tau^5 and its first two time derivatives."""
    # TODO
    raise NotImplementedError("quintic time scaling")


def min_time_polynomial(D, vmax, amax, kind: str = "quintic") -> float:
    """Shortest T keeping |v| <= vmax and |a| <= amax for a rest-to-rest move of |D|."""
    # TODO: README step 3, using CUBIC_PEAKS / QUINTIC_PEAKS
    raise NotImplementedError("minimum duration")


def trapezoid_profile(D, vmax, amax):
    """(T, t_a, v_peak) of the minimum-time trapezoid for distance |D| (triangle if too short)."""
    # TODO: README step 4
    raise NotImplementedError("trapezoid profile")


def trapezoid_sample(t, D, vmax, amax):
    """(x, x', x'') at time t of the trapezoid moving from 0 to D (negative D: mirrored)."""
    # TODO: README step 5
    raise NotImplementedError("sample the trapezoid")
