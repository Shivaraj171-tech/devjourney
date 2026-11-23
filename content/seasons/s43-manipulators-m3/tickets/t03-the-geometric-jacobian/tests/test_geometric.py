import math

from lab import viz

from kin.arm3_dh import arm3_frames
from vel.geometric import geometric_jacobian, origin, z_axis
from vel.numeric import numeric_jacobian

POSES = [[0.4, 0.5, -0.9], [-1.1, 1.2, 0.6], [2.0, -0.3, 1.4]]
NAMES = ["vx", "vy", "vz", "wx", "wy", "wz"]


def tip(q):
    return origin(arm3_frames(q)[-1])


def numeric_omega(q, i, h=1e-6):
    """The gripper's angular velocity (base frame) for joint i alone: w = vee(dR/dt R^T)."""
    def R(qq):
        return [row[:3] for row in arm3_frames(qq)[-1][:3]]
    qp, qm = list(q), list(q)
    qp[i] += h
    qm[i] -= h
    Rp, Rm, R0 = R(qp), R(qm), R(q)
    Rdot = [[(Rp[r][c] - Rm[r][c]) / (2 * h) for c in range(3)] for r in range(3)]
    W = [[sum(Rdot[r][k] * R0[c][k] for k in range(3)) for c in range(3)] for r in range(3)]
    return [W[2][1], W[0][2], W[1][0]]


def column(J, i):
    return [J[r][i] for r in range(6)]


def fmt(v):
    return "(" + ", ".join(f"{x:.3f}" for x in v) + ")"


def test_draw_the_columns():
    frames, arrows = [], []
    for k in range(31):
        s = k / 30
        q = [0.4 + 0.6 * s, 0.5 - 0.2 * s, -0.9 + 0.5 * s]
        F = arm3_frames(q)
        J = geometric_jacobian(F)
        p = origin(F[-1])
        frame_arrows = [{"start": p, "vec": [0.5 * J[r][i] for r in range(3)], "label": f"Jv{i + 1}"} for i in range(3)]
        frame_arrows += [{"start": origin(F[i]), "vec": [0.15 * c for c in z_axis(F[i])], "label": f"z{i}"} for i in range(3)]
        frames.append(F[1:])
        arrows.append(frame_arrows)
    viz.arm3d(frames, local=False, axes=True, arrows=arrows, name="columns", scale=0.08,
              labels=["base", "frame 1", "frame 2", "wrist (frame 3)"], title="Each column: one joint turning alone",
              caption="Short arrows: the joint axes z0, z1, z2. At the wrist: YOUR columns Jv_i (x 0.5), each perpendicular to its axis.")
    assert len(frames) == 31


def test_linear_rows_match_finite_differences():
    for q in POSES:
        J = geometric_jacobian(arm3_frames(q))
        assert len(J) == 6 and len(J[0]) == 3, f"6 rows (vx, vy, vz, wx, wy, wz) of 3 columns, got {len(J)} x {len(J[0])}"
        num = numeric_jacobian(tip, list(q))
        for i in range(3):
            got, want = [J[r][i] for r in range(3)], [num[r][i] for r in range(3)]
            assert max(abs(a - b) for a, b in zip(got, want)) < 1e-6, (
                f"at q = {q}, joint {i + 1} alone moves the wrist at {fmt(want)} (finite differences), "
                f"your column says {fmt(got)}. Which axis does joint {i + 1} turn about: z of frame {i}, or of frame {i + 1}?")


def test_angular_rows_match_finite_differences():
    for q in POSES:
        J = geometric_jacobian(arm3_frames(q))
        for i in range(3):
            got, want = [J[r][i] for r in range(3, 6)], numeric_omega(q, i)
            assert max(abs(a - b) for a, b in zip(got, want)) < 1e-6, (
                f"at q = {q}, joint {i + 1} alone spins the gripper about {fmt(want)}, your Jw column says {fmt(got)}")


def test_base_joint_at_home():
    J = geometric_jacobian(arm3_frames([0.0, 0.0, 0.0]))
    # Straight out along x at home: turning the base swings the wrist sideways (+y), at the arm's reach.
    want = [0.0, 0.7, 0.0, 0.0, 0.0, 1.0]
    got = column(J, 0)
    assert max(abs(a - b) for a, b in zip(got, want)) < 1e-9, (
        f"at home the base joint (axis z0 = up) moves the wrist at (0, 0.7, 0) and spins it about (0, 0, 1): "
        f"expected {fmt(want)}, got {fmt(got)}")
