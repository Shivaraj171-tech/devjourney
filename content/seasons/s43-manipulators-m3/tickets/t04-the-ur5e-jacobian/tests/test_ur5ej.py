import math

from lab import viz

from kin.ur5e import ur5e_fk, ur5e_frames
from rigid.rotations import rot_z
from rigid.transform import make_T
from vel.ur5ej import flange_velocity, numeric_geometric_jacobian, ur5e_jacobian

POSES = [[0.3, -1.2, 1.5, -0.8, 1.1, 0.4], [-1.7, -0.6, -1.9, 2.2, -0.5, 3.0], [2.5, -2.0, 0.7, -1.4, -2.3, -1.0]]
Q0 = [0.3, -1.2, 1.5, -0.8, 1.1, 0.4]
QDOT = [0.2, -0.3, 0.4, 0.5, -0.6, 0.7]
LABELS = ["base", "frame 1", "frame 2", "3", "4", "5", "flange"]
ROWS = ["vx", "vy", "vz", "wx", "wy", "wz"]


def fmt(v):
    return "(" + ", ".join(f"{x:.3f}" for x in v) + ")"


def worst(A, B):
    """(error, row, column) of the biggest difference."""
    return max((abs(A[r][c] - B[r][c]), r, c) for r in range(6) for c in range(len(A[0])))


def test_draw_the_flange_velocity():
    frames, arrows = [], []
    for k in range(31):  # one second at constant joint speeds
        q = [a + b * k / 30 for a, b in zip(Q0, QDOT)]
        F = ur5e_frames(q)
        v, w = flange_velocity(q, QDOT)
        p = [F[-1][i][3] for i in range(3)]
        frames.append(F[1:])
        arrows.append([{"start": p, "vec": v, "label": "v"}, {"start": p, "vec": [0.2 * x for x in w], "label": "w x 0.2"}])
    viz.arm3d(frames, local=False, axes=True, arrows=arrows, name="ur5e", scale=0.07, labels=LABELS,
              title="The UR5e's flange velocity, from J qdot",
              caption="The flange's v (m/s, drawn 1 s long) and angular velocity w (x 0.2), from the Jacobian. v follows the trail.")
    assert len(frames) == 31


def test_checker_on_a_known_motion():
    # A "robot" whose only joint turns the flange about the base's z axis, 1 m out along x.
    def spin(q):
        return make_T(rot_z(q[0]), (math.cos(q[0]), math.sin(q[0]), 0.0))
    J = numeric_geometric_jacobian(spin, [0.0])
    got = [J[r][0] for r in range(6)]
    want = [0.0, 1.0, 0.0, 0.0, 0.0, 1.0]
    assert max(abs(a - b) for a, b in zip(got, want)) < 1e-6, (
        f"a flange spinning about the base's z at 1 rad/s, 1 m out, moves at v = (0, 1, 0) with w = (0, 0, 1); "
        f"your checker says {fmt(got)}")
    # Same spin, but the flange is turned (rolled) first: w in the BASE frame is still (0, 0, 1).
    def spin_rolled(q):
        T = spin(q)
        R = [[T[0][0], T[0][1], T[0][2]], [T[1][0], T[1][1], T[1][2]], [T[2][0], T[2][1], T[2][2]]]
        tilt = [[1, 0, 0], [0, 0, -1], [0, 1, 0]]  # the flange's own frame tipped 90 deg about its x
        Rt = [[sum(R[i][k] * tilt[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
        return make_T(Rt, (T[0][3], T[1][3], T[2][3]))
    J = numeric_geometric_jacobian(spin_rolled, [0.4])
    got = [J[r][0] for r in range(3, 6)]
    assert max(abs(a - b) for a, b in zip(got, [0.0, 0.0, 1.0])) < 1e-6, (
        f"the flange spins about the BASE's z axis at 1 rad/s, so w = (0, 0, 1) in base axes whatever way the flange is "
        f"tipped; your checker says {fmt(got)}. dR/dt = [w] R: which side is R on?")


def test_ur5e_jacobian_passes_the_finite_difference_check():
    for q in POSES:
        J, N = ur5e_jacobian(q), numeric_geometric_jacobian(ur5e_fk, q)
        assert len(J) == 6 and len(J[0]) == 6, f"the UR5e's Jacobian is 6 x 6, got {len(J)} x {len(J[0])}"
        err, r, c = worst(J, N)
        assert err < 1e-6, (
            f"at q = {q}: row {ROWS[r]}, joint {c + 1}: the Jacobian says {J[r][c]:.4f}, finite differences "
            f"{N[r][c]:.4f}. Only the w rows disagree? Then check the checker first.")


def test_flange_velocity_follows_the_motion():
    v, w = flange_velocity(Q0, QDOT)
    h = 1e-6
    ahead = ur5e_fk([a + h * b for a, b in zip(Q0, QDOT)])
    behind = ur5e_fk([a - h * b for a, b in zip(Q0, QDOT)])
    want = [(ahead[i][3] - behind[i][3]) / (2 * h) for i in range(3)]
    assert max(abs(a - b) for a, b in zip(v, want)) < 1e-6, f"the flange moves at {fmt(want)} m/s, J qdot gives {fmt(v)}"
    assert abs(math.sqrt(sum(x * x for x in w)) - 1.4005) < 1e-3, f"|w| should be about 1.4005 rad/s, got {math.sqrt(sum(x * x for x in w)):.4f}"
