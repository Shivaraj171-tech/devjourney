import math

from lab import viz

from kin.ur5 import UR5_DH, ur5_fk, ur5_frames
from rigid.rotations import is_rotation
from rigid.transform import rotation_of, translation_of

# The UR5's documented home pose (all joints at 0): the flange position in the base frame
# (Universal Robots' DH article; nominal, uncalibrated parameters).
HOME = (-0.81725, -0.19145, -0.005491)

# Three random poses, checked against an independent implementation (the numpy laptop lab,
# labs/manipulators lab 06): joint angles -> flange position p and approach axis z.
REFERENCE = [
    ([0.3, -1.2, 1.5, -0.8, 1.1, 0.4], (-0.566673, -0.328622, 0.321459), (-0.61313, -0.664466, 0.427268)),
    ([-1.7, -0.6, -1.9, 2.2, -0.5, 3.0], (-0.176411, 0.049941, 0.4618), (-0.92928, -0.341123, -0.14168)),
    ([2.5, -2.0, 0.7, -1.4, -2.3, -1.0], (0.051734, 0.029151, 0.912908), (0.14136, -0.937256, -0.318699)),
]
LABELS = ["base", "frame 1", "frame 2", "frame 3", "frame 4", "frame 5", "flange (frame 6)"]


def fmt(v):
    return "(" + ", ".join(f"{x:.4f}" for x in v) + ")"


def off(a, b):
    return max(abs(x - y) for x, y in zip(a, b))


def column(T, j):
    return [T[i][j] for i in range(3)]


def test_draw_the_ur5():
    poses = [[0.0] * 6] + [q for q, _p, _z in REFERENCE[:2]] + [[0.0] * 6]
    frames = []
    for a, b in zip(poses, poses[1:]):
        for i in range(30):
            s = i / 30
            frames.append(ur5_frames([x + (y - x) * s for x, y in zip(a, b)])[1:])
    frames.append(ur5_frames(poses[-1])[1:])
    viz.arm3d(frames, local=False, axes=True, labels=LABELS, target=HOME, name="ur5",
              title="The UR5: six joints, six frames", points=[HOME + ("documented home",)],
              caption="Every DH frame from YOUR table, home → two random poses → home. Right: the flange ends on the documented home pose.")
    assert len(frames[0]) == 6, "six joints: six DH frames after the base"


def test_six_rows():
    assert len(UR5_DH) == 6 and all(len(row) == 4 for row in UR5_DH), "the UR5 table has 6 rows of (a, alpha, d, theta_offset)"


def test_home_pose_matches_the_datasheet():
    got = translation_of(ur5_fk([0.0] * 6))
    assert off(got, HOME) < 1e-6, (
        f"at home (every joint 0) the UR5's flange is at {fmt(HOME)} (Universal Robots' DH article), got {fmt(got)}. "
        "The x coordinate has the wrong sign: compare the table with the datasheet number by number, signs included")


def test_random_poses_match_an_independent_implementation():
    for q, p, z in REFERENCE:
        T = ur5_fk(q)
        assert off(translation_of(T), p) < 1e-5, (
            f"q = {q}: the flange should be at {fmt(p)}, got {fmt(translation_of(T))} "
            f"({off(translation_of(T), p) * 100:.1f} cm off)")
        assert off(column(T, 2), z) < 1e-5, f"q = {q}: the flange's approach axis z6 should be {fmt(z)}, got {fmt(column(T, 2))}"


def test_every_frame_is_a_rigid_transform():
    for k, T in enumerate(ur5_frames([0.4, -0.9, 1.2, 0.3, -0.7, 2.0])):
        assert is_rotation(rotation_of(T), tol=1e-9), f"frame {k}'s rotation is not a proper rotation"
        assert off(T[3], (0, 0, 0, 1)) < 1e-12, f"frame {k}'s bottom row should be [0, 0, 0, 1]"


def test_joint_1_turns_the_whole_arm_about_the_base_z():
    a = translation_of(ur5_fk([0.0] * 6))
    b = translation_of(ur5_fk([math.pi / 2, 0, 0, 0, 0, 0]))
    want = (-a[1], a[0], a[2])
    assert off(b, want) < 1e-6, f"joint 1 at 90° turns the home pose 90° about the base z: expected {fmt(want)}, got {fmt(b)}"
