"""Lab 16 reference solution: polynomial time scaling and trapezoidal velocity profiles."""

from __future__ import annotations

import numpy as np

# peak |ds/dt| * T and peak |d2s/dt2| * T^2 of the rest-to-rest polynomials (README step 3)
CUBIC_PEAKS = (1.5, 6.0)
QUINTIC_PEAKS = (15.0 / 8.0, 10.0 * np.sqrt(3.0) / 3.0)


def cubic_coefficients(x0, x1, v0, v1, T):
    """[a0, a1, a2, a3] of x(t) = a0 + a1 t + a2 t^2 + a3 t^3 with x(0)=x0, x'(0)=v0, x(T)=x1, x'(T)=v1."""
    D = x1 - x0
    return np.array([x0, v0, (3 * D - (2 * v0 + v1) * T) / T**2, (-2 * D + (v0 + v1) * T) / T**3])


def quintic_coefficients(x0, x1, v0, v1, a0, a1, T):
    """[c0..c5] of a quintic matching position, velocity and acceleration at t=0 and t=T."""
    A = np.array([
        [1, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0],
        [0, 0, 2, 0, 0, 0],
        [1, T, T**2, T**3, T**4, T**5],
        [0, 1, 2 * T, 3 * T**2, 4 * T**3, 5 * T**4],
        [0, 0, 2, 6 * T, 12 * T**2, 20 * T**3],
    ], dtype=float)
    return np.linalg.solve(A, np.array([x0, v0, a0, x1, v1, a1], dtype=float))


def cubic_scaling(t, T):
    """(s, ds/dt, d2s/dt2) for s = 3 tau^2 - 2 tau^3, tau = t/T; constant (0 or 1, at rest) outside."""
    if t <= 0:
        return 0.0, 0.0, 0.0
    if t >= T:
        return 1.0, 0.0, 0.0
    tau = t / T
    return 3 * tau**2 - 2 * tau**3, (6 * tau - 6 * tau**2) / T, (6 - 12 * tau) / T**2


def quintic_scaling(t, T):
    """(s, ds/dt, d2s/dt2) for s = 10 tau^3 - 15 tau^4 + 6 tau^5; constant outside [0, T]."""
    if t <= 0:
        return 0.0, 0.0, 0.0
    if t >= T:
        return 1.0, 0.0, 0.0
    tau = t / T
    return (10 * tau**3 - 15 * tau**4 + 6 * tau**5,
            (30 * tau**2 - 60 * tau**3 + 30 * tau**4) / T,
            (60 * tau - 180 * tau**2 + 120 * tau**3) / T**2)


def min_time_polynomial(D, vmax, amax, kind: str = "quintic") -> float:
    """Shortest T for which a rest-to-rest move of distance D respects |v| <= vmax, |a| <= amax."""
    cv, ca = {"cubic": CUBIC_PEAKS, "quintic": QUINTIC_PEAKS}[kind]
    D = abs(D)
    return float(max(cv * D / vmax, np.sqrt(ca * D / amax)))


def trapezoid_profile(D, vmax, amax):
    """(T, t_a, v_peak) of the minimum-time trapezoidal profile for a distance D >= 0.

    If D < vmax^2 / amax the cruise phase vanishes: triangular profile, v_peak = sqrt(D amax).
    """
    D = abs(D)
    if D * amax < vmax**2:
        v = np.sqrt(D * amax)
        ta = v / amax
        return float(2 * ta), float(ta), float(v)
    ta = vmax / amax
    return float(D / vmax + ta), float(ta), float(vmax)


def trapezoid_sample(t, D, vmax, amax):
    """(x, dx/dt, d2x/dt2) at time t on the trapezoidal profile from 0 to D (D may be negative)."""
    sign = 1.0 if D >= 0 else -1.0
    T, ta, v = trapezoid_profile(D, vmax, amax)
    a = v / ta if ta > 0 else 0.0
    if t <= 0:
        x, xd, xdd = 0.0, 0.0, 0.0
    elif t < ta:
        x, xd, xdd = 0.5 * a * t**2, a * t, a
    elif t <= T - ta:
        x, xd, xdd = 0.5 * a * ta**2 + v * (t - ta), v, 0.0
    elif t < T:
        r = T - t
        x, xd, xdd = abs(D) - 0.5 * a * r**2, a * r, -a
    else:
        x, xd, xdd = abs(D), 0.0, 0.0
    return sign * x, sign * xd, sign * xdd
