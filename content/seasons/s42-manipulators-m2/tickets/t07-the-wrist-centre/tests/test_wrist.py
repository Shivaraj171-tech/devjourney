import math
import random

from lab import viz

from kin.dh import fk_dh, fk_dh_frames
from kin.ur5e import ur5e_frames
from kin.wrist import D6, SPHERICAL6_DH, wrist_center, wrist_center_from_arm
from rigid.transform import translation_of


def fmt(v):
    return "(" + ", ".join(f"{x:.3f}" for x in v) + ")"


def dist(a, b):
    return math.dist(a, b)


ARM = [math.radians(-55), math.radians(25), math.radians(-40)]  # joints 1-3: the arm


def random_poses(n=6):
    rng = random.Random(3)
    return [[rng.uniform(-math.pi, math.pi) for _ in range(6)] for _ in range(n)]


def test_draw_the_wrist_spinning():
    frames = []
    for i in range(41):
        s = i / 40
        wrist = [math.radians(120) * s, math.radians(-70) * s, math.radians(150) * s]
        frames.append(fk_dh_frames(SPHERICAL6_DH, ARM + wrist)[1:])
    final = ARM + [math.radians(120), math.radians(-70), math.radians(150)]
    T = fk_dh(SPHERICAL6_DH, final)
    yours = wrist_center(T, D6)
    true = translation_of(fk_dh_frames(SPHERICAL6_DH, final)[4])
    viz.arm3d(frames, local=False, axes=True, name="wrist",
              labels=["base", "frame 1", "frame 2", "frame 3", "frame 4", "frame 5", "flange"],
              points=[tuple(true) + ("wrist centre",), tuple(yours) + ("your wrist centre",)],
              lines=[(translation_of(T), yours)],
              title="A spherical wrist: joints 4-6 spin about one point",
              caption="Only joints 4-6 move: the gripper turns about the wrist centre. Right: your wrist centre stays on it.")
    assert len(frames[0]) == 6


def test_wrist_centre_is_where_the_wrist_axes_meet():
    for q in random_poses():
        frames = fk_dh_frames(SPHERICAL6_DH, q)
        got = wrist_center(frames[-1], D6)
        want = translation_of(frames[4])
        assert dist(got, want) < 1e-9, (
            f"the wrist centre should be at {fmt(want)} (the origin of frames 4 and 5), got {fmt(got)} "
            f"({dist(got, want) * 100:.1f} cm off). Back off d6 along the flange's z axis: which part of T holds that axis?")


def test_the_wrist_joints_never_move_the_wrist_centre():
    base = wrist_center(fk_dh(SPHERICAL6_DH, ARM + [0.0, 0.0, 0.0]), D6)
    for wrist in ([1.0, 0.0, 0.0], [0.0, -1.2, 0.0], [2.0, 0.7, -2.5]):
        moved = wrist_center(fk_dh(SPHERICAL6_DH, ARM + wrist), D6)
        assert dist(base, moved) < 1e-9, (
            f"turning only joints 4-6 to {[round(math.degrees(w)) for w in wrist]}° moved your wrist centre by {dist(base, moved) * 100:.1f} cm: "
            "for a spherical wrist it must stay put")


def test_position_decouples_from_orientation():
    for q in random_poses():
        got = wrist_center(fk_dh(SPHERICAL6_DH, q), D6)
        want = wrist_center_from_arm(*q[:3])
        assert dist(got, want) < 1e-9, f"the wrist centre depends on joints 1-3 only: {fmt(want)}, got {fmt(got)}"


def test_home_wrist_centre():
    got = wrist_center(fk_dh(SPHERICAL6_DH, [0.0] * 6), D6)
    assert dist(got, (0.7, 0.0, 0.3)) < 1e-9, f"at home the wrist centre is at (0.700, 0.000, 0.300), got {fmt(got)}"


def test_the_ur5e_wrist_is_not_spherical():
    frames = ur5e_frames([0.3, -1.0, 1.2, 0.4, 0.8, -0.5])
    gap = dist(translation_of(frames[4]), translation_of(frames[5]))
    assert gap > 0.05, "the UR5e's wrist axes don't meet in one point (d5 = 0.0997 m sits between them)"
