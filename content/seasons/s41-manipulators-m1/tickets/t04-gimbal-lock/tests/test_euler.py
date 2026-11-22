import math

from lab import viz

from rigid.euler import from_euler_zyx, to_euler_zyx


def deg(angles):
    return "(" + ", ".join(f"{math.degrees(a):.1f}" for a in angles) + ") deg"


def max_diff(A, B):
    return max(abs(a - b) for ra, rb in zip(A, B) for a, b in zip(ra, rb))


def pose(R, p):
    return [list(R[0]) + [p[0]], list(R[1]) + [p[1]], list(R[2]) + [p[2]], [0.0, 0.0, 0.0, 1.0]]


def round_trip(yaw, pitch, roll):
    R = from_euler_zyx(yaw, pitch, roll)
    back = from_euler_zyx(*to_euler_zyx(R))
    return R, back


def test_round_trip_ordinary_angles():
    for angles in [(0.3, 0.2, -0.4), (2.5, -1.0, 0.7), (-1.2, 0.9, 3.0)]:
        got = to_euler_zyx(from_euler_zyx(*angles))
        assert all(abs(g - w) < 1e-9 for g, w in zip(got, angles)), (
            f"to_euler_zyx(from_euler_zyx{deg(angles)}) should give the same angles back, got {deg(got)}")


def test_pitch_has_the_right_sign():
    got = to_euler_zyx(from_euler_zyx(0.0, math.radians(30), 0.0))
    assert abs(got[1] - math.radians(30)) < 1e-9, (
        f"a pure pitch of +30 deg came back as {math.degrees(got[1]):.1f} deg: R[2][0] is -sin(pitch), not +sin(pitch)")


def test_gimbal_lock_two_knobs_one_motion():
    """At pitch 90 deg, yaw and roll turn about the SAME axis: yaw +a looks exactly like roll -a."""
    frames = []
    for i in range(41):
        a = math.radians(-60 + 120 * i / 40)
        frames.append([pose(from_euler_zyx(a, math.pi / 2, 0.0), (0.0, -0.5, 0.0)), pose(from_euler_zyx(0.0, math.pi / 2, -a), (0.0, 0.5, 0.0))])
    viz.frames3d("gimbal lock", frames, labels=["yaw sweeps", "roll sweeps (-)"], links=False,
                 title="Gimbal lock: pitch = 90°", caption="Left: only yaw changes. Right: only roll changes. Same motion: one degree of freedom is gone.")
    for a in (0.2, 1.0, -0.7):
        R1 = from_euler_zyx(a, math.pi / 2, 0.0)
        R2 = from_euler_zyx(0.0, math.pi / 2, -a)
        assert max_diff(R1, R2) < 1e-9, "at pitch 90 deg, yaw +a and roll -a should give the same matrix"


def test_gimbal_lock_round_trip():
    original = (math.radians(40), math.pi / 2, math.radians(-25))
    R, back = round_trip(*original)
    got = to_euler_zyx(R)
    frames = []
    for i in range(31):
        t = i / 30
        frames.append([pose(from_euler_zyx(*[a * t for a in original]), (0.0, 0.0, 0.0)), pose(from_euler_zyx(*[a * t for a in got]), (0.0, 0.0, 0.6))])
    viz.frames3d("lock round trip", frames, labels=["original", "rebuilt from your angles"], links=False,
                 target=pose(R, (0.0, 0.0, 0.6)), title="Gimbal lock round trip",
                 caption="Top: the box rebuilt from to_euler_zyx's angles. It must end on the dashed pose (the original turn).")
    assert max_diff(R, back) < 1e-6, (
        f"at gimbal lock, to_euler_zyx returned {deg(got)}: rebuilding the matrix from them is off by {max_diff(R, back):.2f}. "
        "Yaw and roll can't be told apart here: pick roll = 0 and give yaw the whole turn")
    assert abs(got[1] - math.pi / 2) < 1e-6, f"pitch should come back as 90.0 deg, got {math.degrees(got[1]):.1f}"


def test_lock_upside_down_too():
    R, back = round_trip(math.radians(-70), -math.pi / 2, math.radians(15))
    assert max_diff(R, back) < 1e-6, "pitch -90 deg is gimbal lock too: the round trip must still rebuild the same matrix"
