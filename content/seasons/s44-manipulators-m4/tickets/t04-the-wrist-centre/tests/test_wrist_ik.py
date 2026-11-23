import math

from lab import viz

from ik.wrist_ik import arm_ik, spherical6_ik, wrist_center_of
from kin.dh import fk_dh, fk_dh_frames
from kin.wrist import D6, SPHERICAL6_DH, wrist_center_from_arm
from rigid.transform import translation_of

# Targets made by forward kinematics from known joints: (name, q). The first points straight down.
POSES = [("pick, straight down", [0.6, 0.3, 0.4, 0.0, -math.pi / 2 - 0.7, 0.6]),
         ("tilted", [0.3, 0.5, -0.4, 0.7, 0.9, 1.2]),
         ("from the side", [-1.1, 0.2, 0.6, -1.4, 1.3, -0.5]),
         ("reaching back", [2.4, 0.8, -0.2, 0.5, 0.6, 2.0])]
LABELS = ["base", "frame 1", "frame 2", "3", "4", "5", "flange"]


def fmt(v):
    return "(" + ", ".join(f"{x:.3f}" for x in v) + ")"


def target(q):
    return fk_dh(SPHERICAL6_DH, q)


def test_draw_the_decoupling():
    T = target(POSES[1][1])
    q = spherical6_ik(T) or [0.0] * 6
    frames = [fk_dh_frames(SPHERICAL6_DH, [x * k / 30 for x in q])[1:] for k in range(31)]
    p, w = translation_of(T), wrist_center_of(T)
    viz.arm3d(frames, local=False, axes=True, name="wrist", target=T, labels=LABELS, scale=0.06,
              points=[tuple(w) + ("YOUR wrist centre",)],
              arrows=[{"start": p, "vec": [a - b for a, b in zip(w, p)], "label": "back off d6"}],
              title="Position first, then orientation",
              caption="The arrow backs off from the target flange to YOUR wrist centre. Joints 1-3 put the wrist there; joints 4-6 then turn the flange onto the dashed target.")
    assert len(frames) == 31


def test_wrist_centre_backs_off_along_z6():
    for name, q in POSES:
        got = wrist_center_of(target(q))
        want = wrist_center_from_arm(*q[:3])
        assert math.dist(got, want) < 1e-9, (
            f"{name}: the wrist centre is {fmt(want)}, wrist_center_of says {fmt(got)} "
            f"({math.dist(got, want) * 100:.1f} cm off). Which way does the gripper point in this pose?")


def test_arm_ik_puts_the_wrist_there():
    for name, q in POSES:
        T = target(q)
        q123 = arm_ik(T)
        assert q123 is not None, f"{name}: the wrist centre is within reach, but arm_ik said None (is wrist_center_of right?)"
        got = wrist_center_from_arm(*q123)
        want = wrist_center_from_arm(*q[:3])
        assert math.dist(got, want) < 1e-9, f"{name}: joints {fmt(q123)} put the wrist at {fmt(got)}, it must be at {fmt(want)}"


def test_the_whole_pose():
    for name, q in POSES:
        T = target(q)
        sol = spherical6_ik(T)
        assert sol is not None, f"{name}: the pose was made by forward kinematics, so it is reachable; spherical6_ik said None"
        T2 = target(sol)
        err = max(abs(T[i][j] - T2[i][j]) for i in range(3) for j in range(4))
        assert err < 1e-9, f"{name}: spherical6_ik's joints {fmt(sol)} miss the target pose by {err:.2e}"


def test_d6_is_the_flange_offset():
    assert abs(D6 - 0.10) < 1e-12, "the flange is D6 = 0.10 m beyond the wrist centre"
