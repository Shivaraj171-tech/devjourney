import math

from lab import viz

from rigid.quat import from_axis_angle, norm, to_matrix
from rigid.slerp import angle_between, lerp, slerp

START = from_axis_angle([0.0, 0.0, 1.0], 0.0)
END = from_axis_angle([0.0, 0.0, 1.0], math.radians(160))  # Grabby turns a box 160 deg on the conveyor


def pose(R, p=(0.0, 0.0, 0.0)):
    return [list(R[0]) + [p[0]], list(R[1]) + [p[1]], list(R[2]) + [p[2]], [0.0, 0.0, 0.0, 1.0]]


def test_halfway_is_half_the_turn():
    mid = slerp(START, END, 0.5)
    got = math.degrees(angle_between(START, mid))
    assert abs(got - 80) < 1e-6, f"halfway through a 160 deg turn should be 80 deg, got {got:.2f} deg"


def test_ends_and_unit_length():
    assert max(abs(a - b) for a, b in zip(slerp(START, END, 0.0), START)) < 1e-9, "slerp at t = 0 must be the start"
    assert max(abs(a - b) for a, b in zip(slerp(START, END, 1.0), END)) < 1e-9, "slerp at t = 1 must be the end"
    for i in range(11):
        assert abs(norm(slerp(START, END, i / 10)) - 1) < 1e-9, "every slerp result must be a unit quaternion"


def test_constant_speed():
    frames = []
    for i in range(41):
        t = i / 40
        frames.append([pose(to_matrix(slerp(START, END, t)), (0.0, -0.45, 0.0)), pose(to_matrix(lerp(START, END, t)), (0.0, 0.45, 0.0))])
    viz.frames3d("slerp vs lerp", frames, labels=["your slerp", "naive lerp"], links=False,
                 title="Turning a box 160°: slerp vs naive lerp",
                 caption="Right: a straight-line blend is not a unit quaternion, so mid-way its axes shrink and it rushes the middle.")
    angles = [math.degrees(angle_between(START, slerp(START, END, i / 8))) for i in range(9)]
    steps = [b - a for a, b in zip(angles, angles[1:])]
    assert max(steps) - min(steps) < 1e-6, (
        f"each eighth of the time should turn the same 20.0 deg, but the steps are {', '.join(f'{s:.1f}' for s in steps)} deg: "
        "a normalised lerp rushes through the middle. Blend along the sphere: sin((1 - t) theta) and sin(t theta)")


def test_takes_the_short_way_round():
    # The same end orientation, stored as -q (the camera sends it that way half of the time).
    flipped = [-c for c in END]
    mid = slerp(START, flipped, 0.5)
    got = math.degrees(angle_between(START, mid))
    assert abs(got - 80) < 1e-6, (
        f"q and -q are the same orientation, so halfway should still be 80 deg, got {got:.1f} deg. "
        "If dot(q0, q1) < 0, flip q1 first so the blend goes the short way")


def test_tiny_turn_does_not_divide_by_zero():
    q1 = from_axis_angle([0.0, 1.0, 0.0], 1e-7)
    mid = slerp(START, q1, 0.5)
    assert abs(norm(mid) - 1) < 1e-9, "slerp between two almost equal orientations must still be a unit quaternion"
