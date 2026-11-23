import math

from lab import viz

from vel.numeric import numeric_jacobian, step, tip_velocity
from vel.two_link import L1, L2, two_link_links, two_link_tip

Q = [0.3, 0.9]        # where the arm is (rad)
QDOT = [0.5, -0.4]    # how fast each joint turns (rad/s)


def exact_velocity(q, qdot):
    """Rosa's hand derivation (ticket 2 derives it): d/dt of x = l1 cos q1 + l2 cos(q1 + q2), ..."""
    q1, q2 = q
    w1, w12 = qdot[0], qdot[0] + qdot[1]
    return [-L1 * math.sin(q1) * w1 - L2 * math.sin(q1 + q2) * w12,
            L1 * math.cos(q1) * w1 + L2 * math.cos(q1 + q2) * w12, 0.0]


def fmt(v):
    return "(" + ", ".join(f"{x:.4f}" for x in v) + ")"


def test_draw_the_moving_arm():
    frames, arrows = [], []
    for k in range(21):  # one second, joints at constant speed
        q = [Q[0] + QDOT[0] * k / 20, Q[1] + QDOT[1] * k / 20]
        frames.append(two_link_links(q))
        v = tip_velocity(two_link_tip, list(q), QDOT)
        arrows.append([{"start": two_link_tip(q), "vec": v, "label": "v"}])
    viz.arm3d(frames, axes=True, arrows=arrows, name="speed", labels=["shoulder", "elbow", "gripper"],
              title="Joint speeds in, gripper velocity out",
              caption="The arrow is YOUR tip_velocity (m/s, drawn 1 s long). Right: it is tangent to the path and reaches where the gripper will be a moment later.")
    assert len(frames) == 21


def test_step_leaves_q_alone():
    q = [0.3, 0.9]
    moved = step(q, [1.0, -1.0], 0.1)
    assert q == [0.3, 0.9], f"step() changed the caller's list: q is now {q}. Build and return a NEW list instead"
    assert moved == [0.4, 0.8] or max(abs(a - b) for a, b in zip(moved, [0.4, 0.8])) < 1e-12, f"step(q, (1, -1), 0.1) should be [0.4, 0.8], got {moved}"


def test_tip_velocity_matches_the_derivation():
    got = tip_velocity(two_link_tip, list(Q), QDOT)
    want = exact_velocity(Q, QDOT)
    err = max(abs(a - b) for a, b in zip(got, want))
    assert err < 1e-6, f"at q = {Q}, qdot = {QDOT} the gripper moves at {fmt(want)} m/s, tip_velocity says {fmt(got)} (off by {err:.2e}; twice too slow, half too fast?)"


def test_numeric_jacobian_columns():
    J = numeric_jacobian(two_link_tip, list(Q))
    assert len(J) == 3 and len(J[0]) == 2, f"3 rows (vx, vy, vz) of 2 columns (one per joint), got {len(J)} x {len(J[0])}"
    for i in range(2):
        e_i = [1.0 if j == i else 0.0 for j in range(2)]
        want = exact_velocity(Q, e_i)
        got = [J[r][i] for r in range(3)]
        assert max(abs(a - b) for a, b in zip(got, want)) < 1e-6, f"column {i + 1} should be the tip velocity with joint {i + 1} alone at 1 rad/s: {fmt(want)}, got {fmt(got)}"


def test_velocity_is_linear_in_the_joint_speeds():
    J = numeric_jacobian(two_link_tip, list(Q))
    v = tip_velocity(two_link_tip, list(Q), QDOT)
    Jq = [J[r][0] * QDOT[0] + J[r][1] * QDOT[1] for r in range(3)]
    assert max(abs(a - b) for a, b in zip(v, Jq)) < 1e-6, f"v should equal J qdot: {fmt(v)} vs {fmt(Jq)}"
