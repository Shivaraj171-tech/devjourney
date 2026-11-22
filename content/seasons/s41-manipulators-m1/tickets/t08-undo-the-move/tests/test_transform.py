import math

from lab import viz

from rigid.mat import identity
from rigid.rotations import rot_x, rot_z
from rigid.transform import T_apply, T_inv, T_mul, make_T


def fmt(v):
    return "(" + ", ".join(f"{x:.2f}" for x in v) + ")"


def max_diff(A, B):
    return max(abs(a - b) for ra, rb in zip(A, B) for a, b in zip(ra, rb))


# The box on the shelf: turned 90 deg about z, 0.6 m forward, 0.2 m left, 0.3 m up.
T_WORLD_BOX = make_T(rot_z(math.pi / 2), (0.6, 0.2, 0.3))


def test_a_point_in_the_box_frame_lands_in_the_world():
    got = T_apply(T_WORLD_BOX, (0.1, 0.0, 0.0))  # the box's handle: 0.1 m along the box's own x axis
    # The box's x axis points along world y (it is turned 90 deg), so the handle is 0.1 m further along y.
    assert max(abs(g - w) for g, w in zip(got, (0.6, 0.3, 0.3))) < 1e-9, f"the handle should be at (0.60, 0.30, 0.30), got {fmt(got)}"


def test_inverse_of_a_pure_move():
    T = make_T(identity(3), (0.5, -0.2, 0.1))
    got = T_inv(T)
    want = make_T(identity(3), (-0.5, 0.2, -0.1))
    assert max_diff(got, want) < 1e-9, (
        f"undoing a move by (0.5, -0.2, 0.1) is a move by (-0.5, 0.2, -0.1), got the matrix {[[round(x, 2) for x in r] for r in got]}")


def test_inverse_undoes_the_transform():
    inv = T_inv(T_WORLD_BOX)
    frames = []
    for i in range(31):
        t = i / 30
        # Blend from the box's pose towards T T^-1 (which must be the world frame itself).
        both = T_mul(T_WORLD_BOX, inv)
        mix = [[(1 - t) * a + t * b for a, b in zip(ra, rb)] for ra, rb in zip(T_WORLD_BOX, both)]
        frames.append([identity(4), T_WORLD_BOX, mix])
    viz.frames3d("undo", frames, labels=["world", "box", "T · T_inv(T)"], links=[(0, 1)],
                 title="T times T_inv(T) should land back on the world frame",
                 caption="The third triad slides from the box to T · T_inv(T). Right answer: it ends exactly on the world frame.")
    assert max_diff(T_mul(T_WORLD_BOX, inv), identity(4)) < 1e-9, (
        "T_WORLD_BOX times T_inv(T_WORLD_BOX) should be the 4x4 identity. Transposing the whole 4x4 also moves the "
        "translation into the bottom row: only the rotation part transposes; the new translation is -R^T p")
    assert max_diff(T_mul(inv, T_WORLD_BOX), identity(4)) < 1e-9, "T_inv(T) times T should be the identity too"


def test_world_point_seen_from_the_box():
    T = make_T(rot_x(0.7), (0.1, 0.4, -0.2))
    p_world = (0.3, -0.1, 0.5)
    p_box = T_apply(T_inv(T), p_world)
    back = T_apply(T, p_box)
    assert max(abs(a - b) for a, b in zip(back, p_world)) < 1e-9, (
        f"T_inv should undo T: going world -> box -> world gave {fmt(back)} instead of {fmt(p_world)}")


def test_bottom_row_stays_0001():
    assert T_inv(T_WORLD_BOX)[3] == [0.0, 0.0, 0.0, 1.0], f"the bottom row of a transform must be [0, 0, 0, 1], got {T_inv(T_WORLD_BOX)[3]}"
