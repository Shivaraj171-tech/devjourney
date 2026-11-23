import math

from lab import viz

from kin.poe import fk_poe
from kin.ur5 import UR5_DH, ur5_frames
from kin.ur5_poe import screws_from_dh
from rigid.transform import T_inv, T_mul
from vel.screw_jac import adjoint, apply6, body_jacobian, geometric_from_space, space_jacobian
from vel.ur5j import ur5_jacobian

M, SCREWS = screws_from_dh(UR5_DH)
POSES = [[0.3, -1.2, 1.5, -0.8, 1.1, 0.4], [-1.7, -0.6, -1.9, 2.2, -0.5, 3.0]]
Q0 = [0.3, -1.2, 1.5, -0.8, 1.1, 0.4]
QDOT = [0.2, -0.3, 0.4, 0.5, -0.6, 0.7]
LABELS = ["base", "frame 1", "frame 2", "3", "4", "5", "flange"]


def fk(q):
    return fk_poe(M, SCREWS, q)


def twist_of(W):
    """(w, v) from a 4x4 [[ [w], v ], [0, 0]]."""
    return [W[2][1], W[0][2], W[1][0], W[0][3], W[1][3], W[2][3]]


def numeric_twists(q, i, h=1e-6):
    """(V_s, V_b) when joint i turns alone at 1 rad/s: vee(dT T^-1) and vee(T^-1 dT)."""
    qp, qm = list(q), list(q)
    qp[i] += h
    qm[i] -= h
    Tp, Tm, T = fk(qp), fk(qm), fk(q)
    dT = [[(a - b) / (2 * h) for a, b in zip(ra, rb)] for ra, rb in zip(Tp, Tm)]
    return twist_of(T_mul(dT, T_inv(T))), twist_of(T_mul(T_inv(T), dT))


def fmt(v):
    return "(" + ", ".join(f"{x:.3f}" for x in v) + ")"


def col(J, i):
    return [J[r][i] for r in range(6)]


def test_draw_the_two_velocities():
    frames, arrows = [], []
    for k in range(31):
        q = [a + b * k / 30 for a, b in zip(Q0, QDOT)]
        Js = space_jacobian(SCREWS, q)
        Vs = [sum(Js[r][c] * QDOT[c] for c in range(6)) for r in range(6)]
        T = fk(q)
        p = [T[i][3] for i in range(3)]
        G = geometric_from_space(Js, p)
        v = [sum(G[r][c] * QDOT[c] for c in range(6)) for r in range(3)]
        frames.append(ur5_frames(q)[1:])
        arrows.append([{"start": p, "vec": v, "label": "flange v"},
                       {"start": [0.0, 0.0, 0.0], "vec": Vs[3:], "label": "v_s (base origin)"},
                       {"start": p, "vec": [0.2 * x for x in Vs[:3]], "label": "w x 0.2"}])
    viz.arm3d(frames, local=False, axes=True, arrows=arrows, name="twists", scale=0.07, labels=LABELS,
              title="One motion, two velocities",
              caption="v_s is the velocity of the point at the BASE ORIGIN, as if it were bolted to the gripper. v_s + w x p gives the flange's own velocity.")
    assert len(frames) == 31


def test_adjoint_moves_a_twist():
    # A frame 1 m up z, not turned, spinning about ITS x axis (w = (1, 0, 0), v = 0). In the base
    # frame: the same w, and the base origin, 1 m below that axis, moves at v = p x w = (0, 1, 0).
    up = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 1.0], [0, 0, 0, 1]]
    got = apply6(adjoint(up), [1.0, 0.0, 0.0, 0.0, 0.0, 0.0])
    want = [1.0, 0.0, 0.0, 0.0, 1.0, 0.0]
    assert max(abs(a - b) for a, b in zip(got, want)) < 1e-12, (
        f"Ad(T) of a spin about x, for a frame 1 m up: w = (1, 0, 0), v = p x w = (0, 1, 0), so {fmt(want)}; got {fmt(got)}. "
        "Which block holds [p]R?")


def test_space_jacobian_matches_finite_differences():
    for q in POSES:
        Js = space_jacobian(SCREWS, q)
        for i in range(6):
            want, _ = numeric_twists(q, i)
            assert max(abs(a - b) for a, b in zip(col(Js, i), want)) < 1e-6, (
                f"at q = {q}, joint {i + 1}: the spatial twist vee(dT T^-1) is {fmt(want)}, J_s's column is {fmt(col(Js, i))}")


def test_body_jacobian_matches_finite_differences():
    for q in POSES:
        Jb = body_jacobian(SCREWS, M, q)
        for i in range(6):
            _, want = numeric_twists(q, i)
            assert max(abs(a - b) for a, b in zip(col(Jb, i), want)) < 1e-6, (
                f"at q = {q}, joint {i + 1}: the body twist vee(T^-1 dT) is {fmt(want)}, J_b's column is {fmt(col(Jb, i))}")


def test_space_jacobian_gives_the_geometric_one():
    for q in POSES:
        T = fk(q)
        G = geometric_from_space(space_jacobian(SCREWS, q), [T[0][3], T[1][3], T[2][3]])
        J = ur5_jacobian(q)
        err = max(abs(G[r][c] - J[r][c]) for r in range(6) for c in range(6))
        assert err < 1e-9, f"at q = {q}, v_s + w x p should give ticket 4's geometric Jacobian (off by {err:.2e})"
