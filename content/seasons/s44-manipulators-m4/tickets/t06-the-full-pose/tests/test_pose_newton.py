import math

from lab import viz

from ik.pose_newton import body_twist_error, log_SE3, newton_pose, ur5_pose
from kin.poe import exp_twist
from kin.ur5 import ur5_frames

Q_BOX = [0.4, -1.0, 1.3, -0.9, 0.8, 0.5]   # the joints that put the flange on the box (unknown to the solver)
Q_NOW = [0.6, -0.8, 1.0, -0.6, 1.0, 0.3]   # where Grabby-6 is now
LABELS = ["base", "frame 1", "frame 2", "3", "4", "5", "flange"]
STEPS = 6


def fmt(v):
    return "(" + ", ".join(f"{x:.3f}" for x in v) + ")"


def test_draw_the_pose_converging():
    T_box = ur5_pose(Q_BOX)
    q, errors, path = newton_pose(T_box, Q_NOW, iters=10)
    frames = []
    for a, b in zip(path, path[1:] + path[-1:]):
        frames += [ur5_frames([x + (y - x) * k / STEPS for x, y in zip(a, b)])[1:] for k in range(STEPS)]
    viz.arm3d(frames, local=False, axes=True, name="pose", target=T_box, scale=0.07, labels=LABELS,
              title="Full-pose Newton on the UR5",
              caption=f"YOUR newton_pose: {len(path) - 1} steps until the flange's frame sits on the dashed target frame, position AND orientation.")
    xs = list(range(len(errors)))
    viz.chart("Body twist error", xs, [e[0] for e in errors], label="|w| (rad)", x_label="iteration", y_label="error", log=True)
    viz.chart("Body twist error", xs, [e[1] for e in errors], label="|v| (m)")
    assert frames


def test_log_undoes_exp():
    for S, theta in (([0.0, 0.0, 1.0, 0.0, -0.3, 0.0], 0.8),          # a revolute joint about z through (0.3, 0, 0)
                     ([0.36, -0.6, 0.71, 0.2, -0.1, 0.4], 1.9),       # a general screw (|w| = 1, roughly)
                     ([0.0, 0.0, 0.0, 0.6, 0.0, 0.8], 0.5)):          # a pure slide
        n = math.sqrt(sum(x * x for x in S[:3])) or 1.0
        S = [x / n for x in S]
        want = [x * theta for x in S]
        got = log_SE3(exp_twist(S, theta))
        assert max(abs(a - b) for a, b in zip(got, want)) < 1e-9, (
            f"log(exp([S] θ)) must give back S θ = {fmt(want)}, got {fmt(got)}. "
            "Rotation part right, translation off? p = G(θ) v, so v = G^-1(θ) p, not p")


def test_no_error_on_target():
    T = ur5_pose(Q_BOX)
    V = body_twist_error(T, T)
    assert max(abs(x) for x in V) < 1e-12, f"already on target: the error twist is zero, got {fmt(V)}"


def test_newton_reaches_the_box():
    T_box = ur5_pose(Q_BOX)
    q, errors, _ = newton_pose(T_box, Q_NOW, iters=10)
    w, v = errors[-1]
    assert w < 1e-9 and v < 1e-9, f"after {len(errors) - 1} steps the error is still |w| = {w:.2e} rad, |v| = {v:.2e} m"
    assert len(errors) <= 7, f"Newton on the exact twist error converges in 5-6 steps here, took {len(errors) - 1}: is the error the true twist?"
    T = ur5_pose(q)
    assert max(abs(T[i][j] - T_box[i][j]) for i in range(3) for j in range(4)) < 1e-8, "the flange must sit on the box's pose"
