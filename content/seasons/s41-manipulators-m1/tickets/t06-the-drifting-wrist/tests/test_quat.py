import math

from lab import viz

from rigid.axis_angle import rodrigues
from rigid.mat import mat_vec
from rigid.quat import conj, from_axis_angle, norm, q_mul, rotate, spin, to_matrix


def fmt(v):
    return "(" + ", ".join(f"{x:.3f}" for x in v) + ")"


def near(a, b, tol=1e-9):
    return all(abs(x - y) <= tol for x, y in zip(a, b))


def pose(R, p=(0.0, 0.0, 0.0)):
    return [list(R[0]) + [p[0]], list(R[1]) + [p[1]], list(R[2]) + [p[2]], [0.0, 0.0, 0.0, 1.0]]


def test_quarter_turn_about_z():
    q = from_axis_angle([0.0, 0.0, 1.0], math.pi / 2)
    half = math.sqrt(0.5)
    assert near(q, [half, 0.0, 0.0, half]), (
        f"90 deg about z should be (cos 45, 0, 0, sin 45) = (0.707, 0, 0, 0.707), got {fmt(q)}: quaternions use HALF the angle")


def test_rotate_matches_rodrigues():
    axis, angle, v = [1.0, -2.0, 0.5], 1.1, [0.3, 0.4, -0.2]
    got = rotate(from_axis_angle(axis, angle), v)
    want = mat_vec(rodrigues(axis, angle), v)
    assert near(got, want), f"rotating {fmt(v)} with the quaternion should match the matrix: {fmt(want)}, got {fmt(got)}"


def test_multiplying_composes():
    a = from_axis_angle([0.0, 0.0, 1.0], 0.4)
    b = from_axis_angle([1.0, 0.0, 0.0], 0.9)
    v = [0.1, 0.7, -0.3]
    assert near(rotate(q_mul(a, b), v), rotate(a, rotate(b, v))), "q_mul(a, b) must mean: turn by b first, then by a"


def test_conjugate_undoes():
    q = from_axis_angle([0.2, 0.3, 0.9], 2.0)
    assert near(q_mul(q, conj(q)), [1.0, 0.0, 0.0, 0.0]), "q times its conjugate should be the identity (1, 0, 0, 0)"


def test_spinning_for_ten_seconds_keeps_q_unit():
    """Grabby's wrist IMU: 2 rad/s about z, integrated at 100 Hz for 10 s (1000 steps)."""
    start = [1.0, 0.0, 0.0, 0.0]
    frames, q = [], start
    for _ in range(50):
        frames.append([pose(to_matrix(q), (0.0, 0.0, 0.3))])
        q = spin(q, [0.0, 0.0, 2.0], 0.01, 20)
    frames.append([pose(to_matrix(q), (0.0, 0.0, 0.3))])
    viz.frames3d("imu", frames, labels=["wrist (from the IMU)"], trail=0, scale=0.35,
                 target=pose(to_matrix(from_axis_angle([0.0, 0.0, 1.0], 20.0)), (0.0, 0.0, 0.3)),
                 title="10 s of spin(): 2 rad/s about z", caption="If |q| drifts above 1, the axes grow: watch the triad's size.")
    assert abs(norm(q) - 1.0) < 1e-9, (
        f"after 1000 steps |q| is {norm(q):.4f}, not 1: every first-order step adds a little length. "
        "Renormalise q after each step")
    v = rotate(q, [0.2, 0.0, 0.0])
    assert abs(math.sqrt(sum(x * x for x in v)) - 0.2) < 1e-9, f"a 0.20 m vector turned by q came out {math.sqrt(sum(x * x for x in v)):.3f} m long"
    want = from_axis_angle([0.0, 0.0, 1.0], 20.0)
    turned, expected = rotate(q, [1.0, 0.0, 0.0]), rotate(want, [1.0, 0.0, 0.0])
    assert near(turned, expected, 1e-3), f"after 20 rad about z, x should point {fmt(expected)}, got {fmt(turned)}"
