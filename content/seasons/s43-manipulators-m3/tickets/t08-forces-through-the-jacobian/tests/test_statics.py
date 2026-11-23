import math

from lab import viz

from kin.arm3_dh import arm3_frames
from kin.rrr import A2, A3
from vel.geometric import geometric_jacobian, origin
from vel.statics import G, hold_box_torques, joint_torques

BOX = 2.0  # kg
POSES = [[0.4, 0.5, -0.9], [-1.1, 1.2, 0.6], [2.0, -0.3, 1.4]]
QDOT = [0.3, -0.7, 0.5]


def fmt(v):
    return "(" + ", ".join(f"{x:.3f}" for x in v) + ")"


def test_draw_holding_the_box():
    frames, arrows, t2, t3 = [], [], [], []
    for k in range(31):  # lift the box: the shoulder from -0.3 to 0.9 rad, the elbow bending
        q = [0.5, -0.3 + 1.2 * k / 30, -0.2 - 0.9 * k / 30]
        F = arm3_frames(q)
        tau = hold_box_torques(q, BOX)
        frames.append(F[1:])
        p = origin(F[-1])
        arrows.append([{"start": p, "vec": [0.0, 0.0, BOX * G * 0.015], "label": f"F = {BOX * G:.1f} N up"}])
        t2.append(tau[1])
        t3.append(tau[2])
    viz.arm3d(frames, local=False, axes=True, arrows=arrows, name="statics", scale=0.08, points=[(0.0, 0.0, 0.0, "base")],
              labels=["base", "frame 1", "frame 2", "gripper"], title="Holding a 2 kg box: tau = J^T F",
              caption="The arrow: the force the gripper pushes up with. The chart: the torques YOUR code asks the motors for.")
    xs = list(range(31))
    viz.chart("Holding torques", xs, t2, label="shoulder (joint 2)", x_label="frame", y_label="torque (N m)", hline=0.0)
    viz.chart("Holding torques", xs, t3, label="elbow (joint 3)")
    assert len(frames) == 31


def test_stretched_out_level():
    tau = hold_box_torques([0.0, 0.0, 0.0], BOX)
    want = [0.0, BOX * G * (A2 + A3), BOX * G * A3]
    assert max(abs(a - b) for a, b in zip(tau, want)) < 1e-9, (
        f"arm straight out and level: the shoulder holds weight x full reach = {want[1]:.3f} N m, the elbow weight x forearm "
        f"= {want[2]:.3f} N m, the base nothing. Expected {fmt(want)}, got {fmt(tau)}")


def test_power_in_equals_power_out():
    for q in POSES:
        Jv = geometric_jacobian(arm3_frames(q))[:3]
        F = [1.5, -2.0, 0.8]
        tau = joint_torques(Jv, F)
        v = [sum(Jv[r][c] * QDOT[c] for c in range(3)) for r in range(3)]
        p_joints = sum(t * w for t, w in zip(tau, QDOT))
        p_hand = sum(f * x for f, x in zip(F, v))
        assert abs(p_joints - p_hand) < 1e-9, (
            f"at q = {q}: the motors' power tau . qdot = {p_joints:.5f} W must equal the gripper's F . v = {p_hand:.5f} W "
            "for EVERY qdot. Which matrix makes that true: J, or J transposed?")


def test_a_wrench_with_a_moment():
    J = [[1.0, 2.0], [0.0, 1.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [1.0, 1.0]]  # 6 x 2: force rows, then moment rows
    tau = joint_torques(J, [3.0, 4.0, 0.0, 0.0, 0.0, 0.5])
    assert len(tau) == 2, f"one torque per JOINT (2 columns), got {len(tau)} numbers"
    assert max(abs(a - b) for a, b in zip(tau, [3.5, 10.5])) < 1e-12, f"tau = J^T F = (3.5, 10.5), got {tau}"


def test_base_feels_no_gravity():
    for q in POSES:
        assert abs(hold_box_torques(q, BOX)[0]) < 1e-9, "joint 1 turns about the vertical: gravity never loads it"
