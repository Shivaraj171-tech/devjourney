import math

from lab import viz

from vel.jacobian2 import det_2link, jacobian_2link, tip_velocity_2link
from vel.numeric import numeric_jacobian
from vel.two_link import L1, L2, two_link_links, two_link_tip

POSES = [[0.0, 0.9], [0.3, 0.9], [1.2, -0.7], [-2.0, 2.5], [2.8, 0.2]]


def fmt(rows):
    return "[" + ", ".join("[" + ", ".join(f"{x:.4f}" for x in r) + "]" for r in rows) + "]"


def ellipse_2x2(J):
    """The velocity ellipse of a 2x2 J: eigen-decomposition of J J^T (closed form for 2x2)."""
    a = J[0][0] ** 2 + J[0][1] ** 2
    b = J[0][0] * J[1][0] + J[0][1] * J[1][1]
    c = J[1][0] ** 2 + J[1][1] ** 2
    mid, rad = (a + c) / 2, math.sqrt(((a - c) / 2) ** 2 + b * b)
    angle = 0.5 * math.atan2(2 * b, a - c)
    radii = [math.sqrt(mid + rad), math.sqrt(max(0.0, mid - rad))]
    u, w = (math.cos(angle), math.sin(angle), 0.0), (-math.sin(angle), math.cos(angle), 0.0)
    return radii, [[u[0], w[0]], [u[1], w[1]], [u[2], w[2]]]


def test_draw_columns_and_the_velocity_ellipse():
    frames, arrows, ellipses = [], [], []
    for k in range(31):  # the elbow straightens out: q2 from 1.6 rad to 0.02 rad
        q = [0.5, 1.6 - 1.58 * k / 30]
        J = jacobian_2link(q)
        tip = two_link_tip(q)
        frames.append(two_link_links(q))
        arrows.append([{"start": tip, "vec": [J[0][0] * 0.5, J[1][0] * 0.5, 0.0], "label": "col 1"},
                       {"start": tip, "vec": [J[0][1] * 0.5, J[1][1] * 0.5, 0.0], "label": "col 2"}])
        radii, axes = ellipse_2x2(J)
        ellipses.append([{"center": tip, "axes": axes, "radii": [r * 0.5 for r in radii], "label": "velocity"}])
    viz.arm3d(frames, axes=True, arrows=arrows, ellipsoids=ellipses, name="columns",
              labels=["shoulder", "elbow", "gripper"], title="The Jacobian's columns, and what they can reach",
              caption="Arrows: YOUR J's columns (joint 1 alone, joint 2 alone, x 0.5). The ellipse: every velocity |qdot| <= 1 gives. Stretch the arm and watch it go flat.")
    assert len(frames) == 31


def test_matches_the_numeric_jacobian():
    for q in POSES:
        got = jacobian_2link(q)
        num = numeric_jacobian(two_link_tip, list(q))[:2]
        err = max(abs(got[r][c] - num[r][c]) for r in range(2) for c in range(2))
        assert err < 1e-6, (
            f"at q = {q} the numeric Jacobian (ticket 1) is {fmt(num)}, jacobian_2link gives {fmt(got)}. "
            "Which angle does the FOREARM point at, in the base frame?")


def test_determinant_is_l1_l2_sin_q2():
    for q in POSES:
        want = L1 * L2 * math.sin(q[1])
        assert abs(det_2link(q) - want) < 1e-9, f"det J at q = {q} should be l1 l2 sin(q2) = {want:.5f}, got {det_2link(q):.5f}"


def test_stretched_arm_is_singular():
    J = jacobian_2link([0.7, 0.0])
    assert abs(det_2link([0.7, 0.0])) < 1e-12, "stretched out (q2 = 0) the Jacobian must be singular"
    # Both columns point the same way: perpendicular to the arm.
    cross = J[0][0] * J[1][1] - J[1][0] * J[0][1]
    assert abs(cross) < 1e-12, f"stretched out, the two columns are parallel; got {fmt(J)}"


def test_tip_velocity_is_j_times_qdot():
    q, qdot = [0.3, 0.9], [0.5, -0.4]
    got = tip_velocity_2link(q, qdot)
    want = [-0.1112, 0.2533]  # ticket 1's numeric velocity, rounded
    assert max(abs(a - b) for a, b in zip(got, want)) < 1e-4, f"v = J qdot should be about {want}, got {[round(x, 4) for x in got]}"
