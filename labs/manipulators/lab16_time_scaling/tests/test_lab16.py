import numpy as np
import pytest


def numdiff(f, t, h=1e-6):
    return (f(t + h) - f(t - h)) / (2 * h)


def sample(fn, T, n=4001):
    return np.array([fn(t, T) for t in np.linspace(0, T, n)])


def test_cubic_coefficients(impl):
    a = np.asarray(impl.cubic_coefficients(0.0, 1.0, 0.0, 0.0, 1.0))
    np.testing.assert_allclose(a, [0, 0, 3, -2], atol=1e-12, err_msg="rest to rest: 3 tau^2 - 2 tau^3")
    x0, x1, v0, v1, T = 0.3, -0.5, 0.2, 0.7, 1.7
    a = np.asarray(impl.cubic_coefficients(x0, x1, v0, v1, T))
    x = np.polynomial.polynomial.Polynomial(a)
    assert (x(0), x.deriv()(0), x(T), x.deriv()(T)) == pytest.approx((x0, v0, x1, v1)), \
        "the cubic must match both positions and both velocities"


def test_quintic_coefficients(impl):
    np.testing.assert_allclose(impl.quintic_coefficients(0, 1, 0, 0, 0, 0, 1.0),
                               [0, 0, 0, 10, -15, 6], atol=1e-10)
    c = np.asarray(impl.quintic_coefficients(0.1, 0.9, -0.3, 0.4, 1.0, -2.0, 2.0))
    x = np.polynomial.polynomial.Polynomial(c)
    got = (x(0), x.deriv()(0), x.deriv(2)(0), x(2.0), x.deriv()(2.0), x.deriv(2)(2.0))
    assert got == pytest.approx((0.1, -0.3, 1.0, 0.9, 0.4, -2.0)), "x, x', x'' at both ends"


@pytest.mark.parametrize("name", ["cubic_scaling", "quintic_scaling"])
def test_scalings(impl, name):
    fn = getattr(impl, name)
    T = 2.0
    assert fn(0.0, T) == pytest.approx((0, 0, fn(0.0, T)[2])), "starts at s = 0 at rest"
    assert fn(T, T)[:2] == pytest.approx((1, 0)), "ends at s = 1 at rest"
    assert fn(T / 2, T)[0] == pytest.approx(0.5), "symmetric: s(T/2) = 1/2"
    assert fn(-1.0, T) == pytest.approx((0, 0, 0)) and fn(3.0, T) == pytest.approx((1, 0, 0)), \
        "hold (s, 0, 0) outside [0, T]"
    for t in (0.3, 0.9, 1.6):
        assert fn(t, T)[1] == pytest.approx(numdiff(lambda x: fn(x, T)[0], t), rel=1e-6), "sdot = ds/dt"
        assert fn(t, T)[2] == pytest.approx(numdiff(lambda x: fn(x, T)[1], t), rel=1e-5), "sddot = dsdot/dt"


def test_quintic_starts_with_zero_acceleration_cubic_does_not(impl):
    assert impl.quintic_scaling(1e-9, 1.0)[2] == pytest.approx(0, abs=1e-6)
    assert impl.cubic_scaling(1e-9, 1.0)[2] == pytest.approx(6.0, rel=1e-6), \
        "the cubic's acceleration jumps to 6/T^2 at t = 0+"


def test_peak_constants(impl):
    for name, peaks in (("cubic_scaling", impl.CUBIC_PEAKS), ("quintic_scaling", impl.QUINTIC_PEAKS)):
        assert None not in peaks, f"fill in the peak constants for {name}"
        s = sample(getattr(impl, name), 1.0, 20001)
        assert peaks[0] == pytest.approx(np.abs(s[1:-1, 1]).max(), rel=1e-6), f"{name}: peak velocity * T"
        assert peaks[1] == pytest.approx(np.abs(s[1:-1, 2]).max(), rel=1e-3), f"{name}: peak acceleration * T^2"
    assert impl.QUINTIC_PEAKS[1] == pytest.approx(10 * np.sqrt(3) / 3)


@pytest.mark.parametrize("kind,name", [("cubic", "cubic_scaling"), ("quintic", "quintic_scaling")])
def test_min_time_polynomial(impl, kind, name):
    for D, vmax, amax in ((1.0, 1.0, 10.0), (1.0, 10.0, 1.0), (-0.8, 2.0, 3.0)):
        T = impl.min_time_polynomial(D, vmax, amax, kind)
        s = sample(getattr(impl, name), T)[1:-1]
        v, a = abs(D) * np.abs(s[:, 1]).max(), abs(D) * np.abs(s[:, 2]).max()
        assert v <= vmax * (1 + 1e-6) and a <= amax * (1 + 1e-3), f"{kind} T={T:.3f} breaks a limit"
        assert max(v / vmax, a / amax) > 0.99, "minimal: one of the limits must be (almost) reached"


def test_trapezoid_profile(impl):
    T, ta, v = impl.trapezoid_profile(1.0, 1.0, 2.0)
    assert (T, ta, v) == pytest.approx((1.5, 0.5, 1.0)), "T = D/vmax + vmax/amax, t_a = vmax/amax"
    T, ta, v = impl.trapezoid_profile(0.2, 1.0, 2.0)
    assert v == pytest.approx(np.sqrt(0.4)) and T == pytest.approx(2 * ta), \
        "D < vmax^2/amax: triangle, v_peak = sqrt(D amax)"


@pytest.mark.parametrize("D,vmax,amax", [(1.0, 1.0, 2.0), (0.2, 1.0, 2.0), (-2.0, 0.8, 1.5)])
def test_trapezoid_sample(impl, D, vmax, amax):
    T, ta, v = impl.trapezoid_profile(D, vmax, amax)
    ts = np.linspace(0, T, 3001)
    X = np.array([impl.trapezoid_sample(t, D, vmax, amax) for t in ts])
    assert X[0] == pytest.approx((0, 0, X[0][2])) and X[-1][:2] == pytest.approx((D, 0)), "0 -> D, rest to rest"
    assert np.abs(X[:, 1]).max() <= vmax + 1e-9 and np.abs(X[:, 2]).max() <= amax + 1e-9, "limits"
    # trapezoid rule: exact inside a phase, ~a dt^2/8 across a phase corner
    np.testing.assert_allclose(np.diff(X[:, 0]), 0.5 * (X[1:, 1] + X[:-1, 1]) * np.diff(ts), atol=1e-6,
                               err_msg="x must be the integral of x' (check the phase formulas)")
    assert np.all(np.diff(X[:, 0]) * np.sign(D) >= -1e-12), "monotonic"
    assert impl.trapezoid_sample(T + 1, D, vmax, amax) == pytest.approx((D, 0, 0))


def test_trapezoid_is_faster_than_polynomials(impl):
    D, vmax, amax = 1.0, 1.0, 2.0
    T_trap = impl.trapezoid_profile(D, vmax, amax)[0]
    assert T_trap < impl.min_time_polynomial(D, vmax, amax, "quintic")
    assert T_trap < impl.min_time_polynomial(D, vmax, amax, "cubic")
