import math

from lab import viz

from kin.dh import dh_transform, fk_dh, fk_dh_frames
from rigid.transform import translation_of

# A two-link arm on a 0.20 m pedestal, as a DH table. Columns: a, alpha, d, theta_offset.
PEDESTAL_DH = [
    [0.5, 0.0, 0.2, 0.0],
    [0.4, 0.0, 0.0, 0.0],
]


def fmt(v):
    return "(" + ", ".join(f"{x:.3f}" for x in v) + ")"


def flat(T):
    return [T[i][j] for i in range(4) for j in range(4)]


def off(a, b):
    return max(abs(x - y) for x, y in zip(a, b))


def by_geometry(q1, q2):
    return (0.5 * math.cos(q1) + 0.4 * math.cos(q1 + q2), 0.5 * math.sin(q1) + 0.4 * math.sin(q1 + q2), 0.2)


def test_draw_one_row_then_the_arm():
    a, alpha, d, theta = 0.4, math.radians(60), 0.25, math.radians(50)
    steps = [dh_transform(0, 0, 0, 0), dh_transform(0, 0, 0, theta), dh_transform(0, 0, d, theta),
             dh_transform(a, 0, d, theta), dh_transform(a, alpha, d, theta)]
    viz.frames3d("one DH row", [steps], labels=["frame i-1", "θ: turn about z", "d: up z", "a: out along new x", "α: twist about x = frame i"],
                 title="One DH row, one step at a time", scale=0.12,
                 caption="Rz(θ), then Tz(d), then Tx(a), then Rx(α): four numbers take frame i-1 to frame i.")
    frames = []
    for i in range(41):
        s = i / 40
        frames.append(fk_dh_frames(PEDESTAL_DH, [math.radians(70) * s, math.radians(-100) * s])[1:])
    goal = by_geometry(math.radians(70), math.radians(-100))
    viz.arm3d(frames, local=False, axes=True, labels=["base", "frame 1", "frame 2"], target=goal, name="pedestal",
              title="The pedestal arm, from its DH table", caption="Drawn from YOUR fk_dh_frames(). Right: the tip lands on the target, 0.20 m up.")
    assert len(frames) == 41


def test_each_parameter_alone():
    c, s = math.cos(0.7), math.sin(0.7)
    assert off(flat(dh_transform(0, 0, 0, 0.7)), [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) < 1e-9, "theta alone is a turn about z"
    assert off(flat(dh_transform(0, 0, 0.3, 0)), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0.3, 0, 0, 0, 1]) < 1e-9, "d alone is a slide along z"
    assert off(flat(dh_transform(0.3, 0, 0, 0)), [1, 0, 0, 0.3, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) < 1e-9, "a alone is a walk along x"
    assert off(flat(dh_transform(0, 0.7, 0, 0)), [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1]) < 1e-9, "alpha alone is a twist about x"


def test_all_four_together():
    got = flat(dh_transform(0.5, math.pi / 2, 0.2, math.pi / 2))
    want = [0, 0, 1, 0,
            1, 0, 0, 0.5,
            0, 1, 0, 0.2,
            0, 0, 0, 1]
    assert off(got, want) < 1e-9, (
        "dh_transform(a=0.5, alpha=90°, d=0.2, theta=90°) should be Rz(θ) Tz(d) Tx(a) Rx(α) = "
        f"{[want[i:i + 4] for i in (0, 4, 8)]}, got {[[round(x, 3) for x in got[i:i + 4]] for i in (0, 4, 8)]}")


def test_frames_start_at_the_base():
    frames = fk_dh_frames(PEDESTAL_DH, [0.1, 0.2])
    assert len(frames) == 3, f"two joints give three frames (base, 1, 2), got {len(frames)}"
    assert off(flat(frames[0]), flat(dh_transform(0, 0, 0, 0))) < 1e-12, "frames[0] is the base: the identity"


def test_the_table_reads_in_the_right_columns():
    for q in [(0.0, 0.0), (math.radians(90), 0.0), (math.radians(30), math.radians(45)), (-1.0, 2.0)]:
        got = translation_of(fk_dh(PEDESTAL_DH, list(q)))
        want = by_geometry(*q)
        assert off(got, want) < 1e-9, (
            f"q = ({math.degrees(q[0]):.0f}°, {math.degrees(q[1]):.0f}°): the tip should be at {fmt(want)}, got {fmt(got)}. "
            "Each row is (a, alpha, d, theta_offset): is the 0.20 m pedestal read as d, or as an angle?")


def test_the_offset_column_shifts_the_joint():
    turned = [[0.5, 0.0, 0.2, math.pi / 2], [0.4, 0.0, 0.0, 0.0]]
    got = translation_of(fk_dh(turned, [0.0, 0.0]))
    assert off(got, (0.0, 0.9, 0.2)) < 1e-9, f"a 90° offset on joint 1 points the arm along y at q = 0: (0, 0.9, 0.2), got {fmt(got)}"


def test_wrong_number_of_joints_is_refused():
    try:
        fk_dh_frames(PEDESTAL_DH, [0.1])
    except ValueError:
        return
    assert False, "fk_dh_frames should raise ValueError when q doesn't have one value per row"
