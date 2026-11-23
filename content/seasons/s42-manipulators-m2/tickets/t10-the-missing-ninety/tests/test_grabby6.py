import math

from lab import viz

from kin.grabby6 import TOOL, arm_frames, gripper_pose
from rigid.transform import translation_of


def fmt(v):
    return "(" + ", ".join(f"{x:.3f}" for x in v) + ")"


def column(T, j):
    return [T[i][j] for i in range(3)]


BOX_212 = (0.4298, 0.7444, 0.1460)  # box #212 in tote 4, base frame (from the incident log)
PICK = [math.radians(a) for a in (60, 20, -50, 0, -60, 0)]  # what the planner sent (unchanged for weeks)
LABELS = ["base", "frame 1", "frame 2", "frame 3", "frame 4", "frame 5", "flange", "fingertips"]


def test_draw_the_pick():
    frames = [arm_frames([a * i / 40 for a in PICK])[1:] for i in range(41)]
    viz.arm3d(frames, local=False, axes=True, labels=LABELS, target=BOX_212, name="pick",
              points=[BOX_212 + ("box #212",)], title="Grabby-6 reaching for box #212",
              caption="Every joint frame from YOUR grabby6.py, home → the planner's pick angles. Right: the fingertips end on the box, pointing straight down.")
    assert len(frames[0]) == 7, f"arm_frames gives the base, 6 joint frames and the fingertips (8), got {len(frames[0]) + 1}"


def test_home_pose_self_test():
    got = translation_of(gripper_pose([0.0] * 6))
    want = (1.15, 0.0, 0.40)
    assert math.dist(got, want) < 1e-9, (
        f"self-test: at home Grabby-6 is straight out, fingertips at {fmt(want)}, got {fmt(got)} "
        f"({math.dist(got, want) * 100:.1f} cm off)")


def test_forearm_is_straight_at_zero():
    elbow, wrist = translation_of(arm_frames([0.0] * 6)[3]), translation_of(arm_frames([0.0] * 6)[4])
    direction = [(w - e) / 0.45 for e, w in zip(elbow, wrist)]
    assert math.dist(direction, (1, 0, 0)) < 1e-9, (
        f"at q3 = 0 the forearm must continue straight out along x (the vendor sheet), but it points {fmt(direction)}: "
        "a DH row's theta is q + offset")


def test_fingertips_are_beyond_the_flange():
    q = [0.3, 0.5, -0.9, 0.4, 1.1, -0.6]
    flange, tips = arm_frames(q)[6], gripper_pose(q)
    want = [flange[i][3] + TOOL * flange[i][2] for i in range(3)]
    got = translation_of(tips)
    assert math.dist(got, want) < 1e-9, (
        f"the fingertips are {TOOL:.2f} m beyond the flange along its z axis: {fmt(want)}, got {fmt(got)}. "
        "Is gripper_pose the fingertips, or the flange?")


def test_box_212_is_picked():
    T = gripper_pose(PICK)
    got = translation_of(T)
    assert math.dist(got, BOX_212) < 1e-3, (
        f"with the planner's angles the fingertips should reach box #212 at {fmt(BOX_212)}, got {fmt(got)} "
        f"({math.dist(got, BOX_212) * 100:.1f} cm off)")
    assert math.dist(column(T, 2), (0, 0, -1)) < 1e-6, f"the gripper must point straight down, z = (0, 0, -1), got {fmt(column(T, 2))}"
