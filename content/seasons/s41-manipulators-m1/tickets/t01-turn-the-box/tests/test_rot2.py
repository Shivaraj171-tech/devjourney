import math

from lab import viz

from rigid.rot2 import apply2, columns, rot2


def close(got, want, tol=1e-9):
    return all(abs(g - w) <= tol for g, w in zip(got, want))


def fmt(v):
    return "(" + ", ".join(f"{x:.2f}" for x in v) + ")"


def pose2(R, x=0.0, y=0.0):
    """A 2x2 rotation as a 4x4 pose on the table (turning about the vertical z axis)."""
    return [[R[0][0], R[0][1], 0.0, x], [R[1][0], R[1][1], 0.0, y], [0.0, 0.0, 1.0, 0.0], [0.0, 0.0, 0.0, 1.0]]


def show(name, degrees):
    world = pose2([[1.0, 0.0], [0.0, 1.0]])
    frames = [[world, pose2(rot2(math.radians(degrees * i / 30)), 0.6, 0.0)] for i in range(31)]
    c, s = math.cos(math.radians(degrees)), math.sin(math.radians(degrees))
    viz.frames3d(name, frames, labels=["table", "box"], links=False, target=pose2([[c, -s], [s, c]], 0.6, 0.0),
                 title=f"Turning the box by rot2({degrees}°)",
                 caption="The box's frame turns with YOUR rot2(). The dashed triad is where an anticlockwise turn ends up.")


def test_quarter_turn_sends_x_to_y():
    show("quarter turn", 90)
    got = apply2(rot2(math.pi / 2), [1.0, 0.0])
    assert close(got, [0.0, 1.0]), (
        f"turning the x axis (1, 0) anticlockwise by 90 degrees should give the y axis (0.00, 1.00), got {fmt(got)}")


def test_columns_are_the_turned_axes():
    R = rot2(math.radians(30))
    x_axis, y_axis = columns(R)
    want_x = [math.cos(math.radians(30)), math.sin(math.radians(30))]
    want_y = [-math.sin(math.radians(30)), math.cos(math.radians(30))]
    assert close(x_axis, want_x), f"column 0 of rot2(30 degrees) should be the turned x axis {fmt(want_x)}, got {fmt(x_axis)}"
    assert close(y_axis, want_y), f"column 1 of rot2(30 degrees) should be the turned y axis {fmt(want_y)}, got {fmt(y_axis)}"


def test_applying_is_the_same_as_reading_columns():
    R = rot2(math.radians(40))
    x_axis, y_axis = columns(R)
    assert close(apply2(R, [1.0, 0.0]), x_axis) and close(apply2(R, [0.0, 1.0]), y_axis), (
        "R times (1, 0) must be R's first column and R times (0, 1) its second")


def test_turning_keeps_lengths():
    show("box corner", 30)
    corner = [0.3, 0.2]
    got = apply2(rot2(math.radians(30)), corner)
    assert abs(math.hypot(*got) - math.hypot(*corner)) < 1e-9, "a rotation must not stretch: the corner moved closer or further"
    want = [0.3 * math.cos(math.radians(30)) - 0.2 * math.sin(math.radians(30)),
            0.3 * math.sin(math.radians(30)) + 0.2 * math.cos(math.radians(30))]
    assert close(got, want), f"the corner (0.30, 0.20) turned anticlockwise by 30 degrees should land at {fmt(want)}, got {fmt(got)}"


def test_turning_back_undoes_it():
    v = [0.5, -0.25]
    back = apply2(rot2(-0.7), apply2(rot2(0.7), v))
    assert close(back, v), f"turning by +0.7 rad then -0.7 rad should bring {fmt(v)} back, got {fmt(back)}"
