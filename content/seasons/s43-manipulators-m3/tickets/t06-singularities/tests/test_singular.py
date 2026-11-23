import math

from lab import viz

from kin.ur5 import ur5_frames
from vel.geometric import origin, z_axis
from vel.linalg import det, rank
from vel.singular import singularity_kinds, ur5_det
from vel.ur5j import ur5_jacobian

LABELS = ["base", "frame 1", "frame 2", "3", "4", "5", "flange"]
BASE = [0.4, -1.2, 1.6, -1.9, 0.6, 0.3]
RANDOM = [[0.3, -1.2, 1.5, -0.8, 1.1, 0.4], [-1.7, -0.6, -1.9, 2.2, -0.5, 3.0], [2.5, -2.0, 0.7, -1.4, -2.3, -1.0]]


def with_joint(q, i, value):
    q = list(q)
    q[i] = value
    return q


def test_draw_the_two_singularities():
    elbow = [with_joint(BASE, 2, 1.6 - 1.6 * k / 30) for k in range(31)]  # q3 -> 0: stretched out
    wrist = [with_joint(BASE, 4, 0.6 - 1.2 * k / 30) for k in range(31)]  # q5 through 0: wrist flip
    viz.arm3d([ur5_frames(q)[1:] for q in elbow], local=False, axes=True, name="elbow", scale=0.07, labels=LABELS,
              title="Singularity 1: the stretched elbow (q3 -> 0)",
              caption="The forearm lines up with the upper arm: no joint can move the wrist further out.")
    arrows = []
    for q in wrist:
        F = ur5_frames(q)
        arrows.append([{"start": origin(F[3]), "vec": [0.25 * c for c in z_axis(F[3])], "label": "joint 4 axis"},
                       {"start": origin(F[5]), "vec": [0.25 * c for c in z_axis(F[5])], "label": "joint 6 axis"}])
    viz.arm3d([ur5_frames(q)[1:] for q in wrist], local=False, axes=True, name="wrist", scale=0.07, labels=LABELS,
              arrows=arrows, title="Singularity 2: the wrist flip (q5 -> 0)",
              caption="At q5 = 0 the axes of joints 4 and 6 are parallel: they do the same job, and one direction is lost.")
    xs = list(range(31))
    viz.chart("det J along each motion", xs, [det(ur5_jacobian(q)) for q in elbow], label="stretching the elbow",
              x_label="frame", y_label="det J (YOUR det)", hline=0.0)
    viz.chart("det J along each motion", xs, [det(ur5_jacobian(q)) for q in wrist], label="flipping the wrist")
    assert len(elbow) == 31


def test_det_of_small_matrices():
    cases = [
        ([[2.0, 0.0], [0.0, 3.0]], 6.0),
        ([[0.0, 1.0], [1.0, 0.0]], -1.0),  # one swap
        ([[1.0, 2.0, 3.0], [4.0, 5.0, 6.0], [7.0, 8.0, 10.0]], -3.0),
        ([[0.0, 2.0, 1.0], [1.0, 0.0, 0.0], [0.0, 0.0, 4.0]], -8.0),
        ([[1.0, 2.0], [2.0, 4.0]], 0.0),
    ]
    for A, want in cases:
        got = det(A)
        assert abs(got - want) < 1e-9, f"det({A}) = {want}, got {got}. Partial pivoting swaps rows: what does a swap do to det?"


def test_det_of_the_ur5_jacobian_matches_the_closed_form():
    for q in RANDOM:
        got, want = det(ur5_jacobian(q)), ur5_det(q)
        assert abs(got - want) < 1e-9, f"at q = {q}: det J by elimination is {got:.6f}, the closed form says {want:.6f}"


def test_rank():
    assert rank([[1.0, 2.0], [2.0, 4.0]]) == 1, "two parallel rows: rank 1"
    assert rank(ur5_jacobian(RANDOM[0])) == 6, "a generic UR5 pose: rank 6 (it can move its flange every way)"
    assert rank(ur5_jacobian(with_joint(BASE, 4, 0.0))) == 5, "q5 = 0 (wrist flip): one direction lost, rank 5"


def test_singularity_kinds():
    assert singularity_kinds(BASE) == set(), f"{BASE} is a regular pose, got {singularity_kinds(BASE)}"
    assert singularity_kinds(with_joint(BASE, 2, 0.0)) == {"elbow"}, "q3 = 0: the elbow is stretched out"
    got = singularity_kinds(with_joint(BASE, 4, 0.0))
    assert got == {"wrist"}, f"q5 = 0: the wrist flip (joints 4 and 6 line up), got {got}. Which joint's angle is in the det's wrist factor?"
    got = singularity_kinds(with_joint(BASE, 3, 0.0))
    assert "wrist" not in got, f"q4 = 0 is NOT a wrist singularity (joint 5's axis is still between 4's and 6's), got {got}"
    assert singularity_kinds([0.0] * 6) == {"elbow", "wrist"}, "the home pose is stretched AND wrist-flipped"
