import math
import random

from lab import viz

from kin.ur5 import UR5_DH, ur5_fk, ur5_frames
from kin.ur5_poe import screws_from_dh, ur5_poe
from rigid.transform import translation_of


def fmt(v):
    return "(" + ", ".join(f"{x:.4f}" for x in v) + ")"


def flat(T):
    return [T[i][j] for i in range(3) for j in range(4)]


def off(a, b):
    return max(abs(x - y) for x, y in zip(a, b))


def random_poses(n=8, seed=2026):
    rng = random.Random(seed)
    return [[rng.uniform(-math.pi, math.pi) for _ in range(6)] for _ in range(n)]


def test_draw_both_roads():
    q = random_poses(1, seed=9)[0]
    frames = [ur5_frames([a * i / 40 for a in q])[1:] for i in range(41)]
    M, screws = screws_from_dh(UR5_DH)
    lines = []
    for S, T in zip(screws, ur5_frames([0.0] * 6)[:-1]):
        o = translation_of(T)
        lines.append((tuple(o), tuple(o[i] + 0.15 * S[i] for i in range(3))))  # each screw axis, at home
    viz.arm3d(frames, local=False, axes=True, name="dh vs poe", target=ur5_poe(q), lines=lines, scale=0.08,
              labels=["base", "frame 1", "frame 2", "3", "4", "5", "flange (DH)"],
              title="Two roads, one pose: DH frames vs the PoE target",
              caption="Arm: DH frames. Dashed: YOUR PoE pose. Grey: your screw axes at home. Right: the flange sits ON the dashed triad.")
    assert len(screws) == 6, f"six joints: six screw axes, got {len(screws)}"


def test_home_pose_is_m():
    M, _ = screws_from_dh(UR5_DH)
    assert off(flat(M), flat(ur5_fk([0.0] * 6))) < 1e-12, "M is the flange's pose at home"


def test_joint_1_is_the_base_z_axis():
    _, screws = screws_from_dh(UR5_DH)
    assert off(screws[0], (0, 0, 1, 0, 0, 0)) < 1e-12, (
        f"joint 1 turns about the base's z axis, through the origin: S1 = (0, 0, 1, 0, 0, 0), got {[round(c, 4) for c in screws[0]]}. "
        "Joint i turns about the z axis of DH frame i-1")


def test_screws_are_pure_turns():
    _, screws = screws_from_dh(UR5_DH)
    for i, S in enumerate(screws, start=1):
        w, v = S[:3], S[3:]
        assert abs(sum(c * c for c in w) - 1) < 1e-9, f"S{i}: omega must be a unit vector"
        assert abs(sum(a * b for a, b in zip(w, v))) < 1e-9, f"S{i}: a revolute joint has omega . v = 0 (no screw pitch)"


def test_dh_and_poe_agree_at_random_poses():
    for q in random_poses():
        dh, poe = ur5_fk(q), ur5_poe(q)
        assert off(flat(dh), flat(poe)) < 1e-9, (
            f"q = ({', '.join(f'{a:.2f}' for a in q)}): DH puts the flange at {fmt(translation_of(dh))}, "
            f"PoE at {fmt(translation_of(poe))} ({math.dist(translation_of(dh), translation_of(poe)) * 100:.1f} cm apart)")


def test_one_joint_at_a_time():
    for j in range(6):
        q = [0.0] * 6
        q[j] = 0.9
        assert off(flat(ur5_fk(q)), flat(ur5_poe(q))) < 1e-9, f"moving joint {j + 1} alone: DH and PoE disagree"
