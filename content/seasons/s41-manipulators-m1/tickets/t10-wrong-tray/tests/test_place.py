import math

from lab import viz

from rigid.frames import box_in_gripper, chain
from rigid.place import BASE_HEIGHT, TOOL, UPPER_ARM, T_base_turntable, T_turntable_wrist, gripper_pose
from rigid.transform import translation_of


def fmt(v):
    return "(" + ", ".join(f"{x:.3f}" for x in v) + ")"


def off(got, want):
    return math.dist(got, want)


TRAY = (0.2685, 0.4650, 0.0900)  # tray 3, measured by the camera in the base frame (from the incident log)
TRAY_JOINTS = (math.radians(60), math.radians(30), 0.0)  # what the planner sent for tray 3


def show():
    frames = []
    for i in range(41):
        t = i / 40
        yaw, pitch, roll = (a * t for a in TRAY_JOINTS)
        T1 = T_base_turntable(yaw)
        T2 = chain(T1, T_turntable_wrist(pitch))
        frames.append([T1, T2, gripper_pose(yaw, pitch, roll)])
    viz.arm3d(frames, local=False, labels=["turntable", "wrist", "gripper"], target=TRAY, name="place",
              title="Placing box #77 in tray 3", points=[TRAY + ("tray 3",)],
              caption="Each joint drawn from YOUR chain (base → turntable → wrist → gripper). The gripper must end on the tray.")


def test_straight_out():
    got = translation_of(gripper_pose(0.0, 0.0, 0.0))
    want = (UPPER_ARM + TOOL, 0.0, BASE_HEIGHT)
    assert off(got, want) < 1e-9, f"with every joint at 0 the gripper should be at {fmt(want)}, got {fmt(got)}"


def test_turntable_quarter_turn():
    got = translation_of(gripper_pose(math.pi / 2, 0.0, 0.0))
    want = (0.0, UPPER_ARM + TOOL, BASE_HEIGHT)
    assert off(got, want) < 1e-9, (
        f"yaw 90 deg should swing the whole arm round to {fmt(want)}, got {fmt(got)}: "
        "is the chain multiplied base first (T_base_turntable on the left)?")


def test_pitch_tips_the_whole_arm():
    got = translation_of(gripper_pose(0.0, math.radians(30), 0.0))
    reach = UPPER_ARM + TOOL
    want = (reach * math.cos(math.radians(30)), 0.0, BASE_HEIGHT - reach * math.sin(math.radians(30)))
    assert off(got, want) < 1e-9, (
        f"pitch 30 deg should tip the WHOLE arm down from the shoulder, to {fmt(want)}, got {fmt(got)} "
        f"({off(got, want) * 100:.1f} cm off): tilt first, then walk along the tilted arm")


def test_box_77_lands_in_tray_3():
    show()
    T = gripper_pose(*TRAY_JOINTS)
    got = translation_of(T)
    assert off(got, TRAY) < 1e-3, f"the gripper should reach tray 3 at {fmt(TRAY)}, got {fmt(got)} ({off(got, TRAY) * 100:.1f} cm off)"
    seen = box_in_gripper(T, TRAY)
    assert max(abs(c) for c in seen) < 1e-3, f"seen from the gripper, the tray should be right at the fingertips (0, 0, 0), got {fmt(seen)}"


def test_roll_twists_without_moving():
    a = translation_of(gripper_pose(0.4, 0.2, 0.0))
    b = translation_of(gripper_pose(0.4, 0.2, 1.3))
    assert off(a, b) < 1e-9, "rolling the wrist turns the gripper about its own x axis: it must not move the fingertips"
