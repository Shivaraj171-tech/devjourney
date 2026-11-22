import math

from lab import viz

from rigid.mat import identity, mat_vec, matmul, then, transpose

# Quarter turns about the world z and x axes, written out by hand.
RZ90 = [[0.0, -1.0, 0.0], [1.0, 0.0, 0.0], [0.0, 0.0, 1.0]]
RX90 = [[1.0, 0.0, 0.0], [0.0, 0.0, -1.0], [0.0, 1.0, 0.0]]


def close(A, B, tol=1e-9):
    return all(abs(a - b) <= tol for ra, rb in zip(A, B) for a, b in zip(ra, rb))


def fmt(v):
    return "(" + ", ".join(f"{x:.2f}" for x in v) + ")"


def pose(R, p=(0.0, 0.0, 0.0)):
    return [R[0] + [p[0]], R[1] + [p[1]], R[2] + [p[2]], [0.0, 0.0, 0.0, 1.0]]


def turn_z(a):
    c, s = math.cos(a), math.sin(a)
    return [[c, -s, 0.0], [s, c, 0.0], [0.0, 0.0, 1.0]]


def turn_x(a):
    c, s = math.cos(a), math.sin(a)
    return [[1.0, 0.0, 0.0], [0.0, c, -s], [0.0, s, c]]


def show():
    """Turn 90 degrees about world z, then 90 degrees about world x, using YOUR then()."""
    right = [[0.0, -1.0, 0.0], [0.0, 0.0, -1.0], [1.0, 0.0, 0.0]]  # RX90 RZ90, worked out by hand
    frames = []
    try:
        for i in range(21):
            frames.append([pose(identity(3)), pose(then(turn_z(math.pi / 2 * i / 20), identity(3)), (0.5, 0.5, 0.0))])
        for i in range(21):
            frames.append([pose(identity(3)), pose(then(RZ90, turn_x(math.pi / 2 * i / 20)), (0.5, 0.5, 0.0))])
        caption = "First half: the turn about z. Second half: then about the WORLD x axis. Dashed: where it should end."
    except NotImplementedError:
        frames = [[pose(identity(3)), pose(identity(3), (0.5, 0.5, 0.0))]]
        caption = "matmul() isn't written yet, so the box can't turn. Dashed: where it should end."
    viz.frames3d("z then x", frames, labels=["world", "box"], links=False, target=pose(right, (0.5, 0.5, 0.0)),
                 title="then(turn z 90°, turn x 90°)", caption=caption)


def test_matmul_small_example():
    A = [[1, 2, 3], [4, 5, 6]]
    B = [[7, 8], [9, 10], [11, 12]]
    got = matmul(A, B)
    assert got == [[58, 64], [139, 154]], f"[[1,2,3],[4,5,6]] times [[7,8],[9,10],[11,12]] should be [[58, 64], [139, 154]], got {got}"


def test_identity_changes_nothing():
    assert close(matmul(identity(3), RZ90), RZ90) and close(matmul(RZ90, identity(3)), RZ90), "I R and R I must both be R"


def test_order_matters():
    zx, xz = matmul(RX90, RZ90), matmul(RZ90, RX90)
    assert not close(zx, xz), "3D rotations don't commute: RX90 RZ90 and RZ90 RX90 should be different matrices"


def test_then_puts_the_first_turn_on_the_right():
    show()
    R = then(RZ90, RX90)
    got = mat_vec(R, [1.0, 0.0, 0.0])
    # Turn about z: x goes to y. Then about x: y goes to z. So x ends up on z.
    assert all(abs(g - w) < 1e-9 for g, w in zip(got, [0.0, 0.0, 1.0])), (
        f"turning about z then about x should take the x axis to the z axis (0.00, 0.00, 1.00), got {fmt(got)}")


def test_then_matches_turning_twice():
    v = [0.2, -0.4, 0.9]
    one_go = mat_vec(then(RZ90, RX90), v)
    step_by_step = mat_vec(RX90, mat_vec(RZ90, v))
    assert all(abs(a - b) < 1e-9 for a, b in zip(one_go, step_by_step)), (
        f"then(first, second) applied to v must equal second applied to (first applied to v): {fmt(one_go)} vs {fmt(step_by_step)}")


def test_transpose_undoes_a_rotation():
    assert close(matmul(transpose(RZ90), RZ90), identity(3)), "R^T R should be the identity for a rotation"
