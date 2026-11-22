import math

from lab import viz

from rigid.mat import identity, mat_vec
from rigid.rotations import det3, is_rotation, rot_x, rot_y, rot_z


def fmt(v):
    return "(" + ", ".join(f"{x:.2f}" for x in v) + ")"


def near(got, want, tol=1e-9):
    return all(abs(g - w) <= tol for g, w in zip(got, want))


def pose(R, p):
    return [list(R[0]) + [p[0]], list(R[1]) + [p[1]], list(R[2]) + [p[2]], [0.0, 0.0, 0.0, 1.0]]


def show():
    """rot_x, rot_y, rot_z from YOUR code, each turning 0 -> 90 degrees, side by side."""
    frames = []
    for i in range(31):
        a = math.pi / 2 * i / 30
        frames.append([pose(rot_x(a), (0.0, -0.8, 0.0)), pose(rot_y(a), (0.0, 0.0, 0.0)), pose(rot_z(a), (0.0, 0.8, 0.0))])
    viz.frames3d("x y z", frames, labels=["rot_x", "rot_y", "rot_z"], links=False,
                 lines=[((0.0, -0.8, 0.0), (0.45, -0.8, 0.0)), ((0.0, 0.0, 0.0), (0.0, 0.45, 0.0)), ((0.0, 0.8, 0.0), (0.0, 0.8, 0.45))],
                 title="rot_x, rot_y, rot_z: 0 → 90°",
                 caption="Dashed lines: each turn's axis. Right-hand rule: thumb along the axis, fingers curl the positive way.")


def test_rot_x_sends_y_to_z():
    got = mat_vec(rot_x(math.pi / 2), [0.0, 1.0, 0.0])
    assert near(got, [0.0, 0.0, 1.0]), f"rot_x(90 deg) should turn the y axis onto z (0.00, 0.00, 1.00), got {fmt(got)}"


def test_rot_y_sends_z_to_x():
    show()
    got = mat_vec(rot_y(math.pi / 2), [0.0, 0.0, 1.0])
    assert near(got, [1.0, 0.0, 0.0]), (
        f"rot_y(90 deg) should turn the z axis onto x (1.00, 0.00, 0.00) (right-hand rule about y), got {fmt(got)}")


def test_rot_z_sends_x_to_y():
    got = mat_vec(rot_z(math.pi / 2), [1.0, 0.0, 0.0])
    assert near(got, [0.0, 1.0, 0.0]), f"rot_z(90 deg) should turn the x axis onto y (0.00, 1.00, 0.00), got {fmt(got)}"


def test_every_turn_is_a_rotation():
    for name, rot in (("rot_x", rot_x), ("rot_y", rot_y), ("rot_z", rot_z)):
        for degrees in (0, 30, 90, 200):
            R = rot(math.radians(degrees))
            assert is_rotation(R), f"{name}({degrees} deg) should pass is_rotation"
            assert abs(det3(R) - 1) < 1e-9, f"det({name}({degrees} deg)) should be +1, got {det3(R):.3f}"


def test_a_mirror_is_not_a_rotation():
    mirror = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, -1.0]]  # flips z: a left-handed frame
    viz.frames3d("mirror", [pose(identity(3), (0.0, -0.5, 0.0)), pose(mirror, (0.0, 0.5, 0.0))], labels=["right-handed", "mirror (det -1)"],
                 links=False, title="A mirror: orthonormal, but det = -1",
                 caption="Both triads have unit, perpendicular axes. The mirror's z points down: no turn can do that.")
    assert not is_rotation(mirror), (
        "is_rotation accepted a mirror: its columns are unit and perpendicular, but det = -1 (it flips z). "
        "A rotation also needs det(R) = +1")


def test_a_stretch_is_not_a_rotation():
    stretch = [[2.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 0.5]]  # det is 1, but it is not orthonormal
    assert not is_rotation(stretch), "is_rotation accepted a stretch (det 1 but R^T R is not I)"
