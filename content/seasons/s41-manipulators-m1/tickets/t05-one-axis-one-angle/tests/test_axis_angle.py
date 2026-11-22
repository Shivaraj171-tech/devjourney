import math

from lab import viz

from rigid.axis_angle import rodrigues, skew, to_axis_angle
from rigid.mat import mat_vec
from rigid.rotations import is_rotation, rot_z


def fmt(v):
    return "(" + ", ".join(f"{x:.2f}" for x in v) + ")"


def max_diff(A, B):
    return max(abs(a - b) for ra, rb in zip(A, B) for a, b in zip(ra, rb))


def pose(R, p=(0.0, 0.0, 0.0)):
    return [list(R[0]) + [p[0]], list(R[1]) + [p[1]], list(R[2]) + [p[2]], [0.0, 0.0, 0.0, 1.0]]


def test_skew_is_the_cross_product():
    w, v = [1.0, 2.0, 3.0], [-2.0, 0.5, 4.0]
    cross = [w[1] * v[2] - w[2] * v[1], w[2] * v[0] - w[0] * v[2], w[0] * v[1] - w[1] * v[0]]
    assert mat_vec(skew(w), v) == cross, "skew(w) times v must equal the cross product w x v"


def test_about_z_matches_rot_z():
    assert max_diff(rodrigues([0.0, 0.0, 1.0], 0.8), rot_z(0.8)) < 1e-9, "a turn about (0, 0, 1) should equal rot_z"


def test_axis_of_any_length():
    # Grabby's vision system reports the box's tilt axis without scaling it to length 1.
    axis = [1.0, 1.0, 1.0]
    frames = [[pose(rodrigues(axis, math.radians(120) * i / 30))] for i in range(31)]
    viz.frames3d("tilted axis", frames, labels=["box"], lines=[((0.0, 0.0, 0.0), (0.45, 0.45, 0.45))],
                 target=pose([[0.0, 0.0, 1.0], [1.0, 0.0, 0.0], [0.0, 1.0, 0.0]]),
                 title="rodrigues((1, 1, 1), 120°)",
                 caption="Dashed: the axis. A third of a turn about (1, 1, 1) swaps the axes round: x → y → z → x.")
    R = rodrigues(axis, math.radians(120))
    assert is_rotation(R), (
        "rodrigues((1, 1, 1), 120 deg) is not a rotation (its axes got stretched): the formula needs a UNIT axis. "
        "Scale the axis to length 1 first")
    got = mat_vec(R, [1.0, 0.0, 0.0])
    assert all(abs(g - w) < 1e-9 for g, w in zip(got, [0.0, 1.0, 0.0])), f"x should go to y (0.00, 1.00, 0.00), got {fmt(got)}"


def test_round_trip():
    for axis, angle in [([0.0, 0.0, 1.0], 0.5), ([2.0, -1.0, 0.5], 2.0), ([0.0, 3.0, 4.0], 1.2)]:
        R = rodrigues(axis, angle)
        u, got = to_axis_angle(R)
        n = math.sqrt(sum(a * a for a in axis))
        want = [a / n for a in axis]
        assert abs(got - angle) < 1e-9, f"angle should come back as {angle:.3f}, got {got:.3f}"
        assert all(abs(a - b) < 1e-6 for a, b in zip(u, want)), f"axis should come back as {fmt(want)}, got {fmt(u)}"


def test_half_turn():
    # Grabby flips a box over about the diagonal (1, 1, 0): x and y swap, z points down.
    R = [[0.0, 1.0, 0.0], [1.0, 0.0, 0.0], [0.0, 0.0, -1.0]]
    u, angle = to_axis_angle(R)
    h = math.sqrt(0.5)
    assert abs(angle - math.pi) < 1e-9, f"a half turn has angle pi, got {angle:.3f}"
    assert all(abs(abs(a) - b) < 1e-6 for a, b in zip(u, [h, h, 0.0])) and abs(u[0] - u[1]) < 1e-6, (
        f"the flip is about the diagonal, so the axis should be (0.71, 0.71, 0.00) or (-0.71, -0.71, 0.00), got {fmt(u)}. "
        "At 180 deg, sin(angle) is (almost) 0 and R - R^T vanishes: read the axis from R + R^T instead")
    assert max_diff(rodrigues(u, angle), R) < 1e-6, "rodrigues(axis, angle) must rebuild the half turn"


def test_no_turn():
    u, angle = to_axis_angle([[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]])
    assert angle == 0.0, "the identity is a turn of 0"
