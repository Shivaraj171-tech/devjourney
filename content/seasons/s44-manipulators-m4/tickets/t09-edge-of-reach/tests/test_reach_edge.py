import math

from lab import viz

from ik.pose_newton import ur5e_pose
from ik.reach_edge import MAX_STEP, clamp_step, reach
from kin.ur5e import ur5e_frames
from rigid.transform import translation_of
from vel.ellipsoid import velocity_ellipsoid
from vel.ur5ej import ur5e_jacobian

Q_NOW = [0.2, -1.2, 0.9, -1.3, 0.9, 0.1]
LABELS = ["base", "frame 1", "frame 2", "3", "4", "5", "flange"]


def box_414():
    """Box #414, from the incident log: at the far edge of the tote, 1 cm beyond the stretched arm."""
    q_edge = [0.5, -0.7, 0.0, -0.9, 1.2, 0.4]
    T = ur5e_pose(q_edge)
    F = ur5e_frames(q_edge)
    shoulder, wrist = translation_of(F[1]), translation_of(F[3])
    d = [w - s for w, s in zip(wrist, shoulder)]
    n = math.sqrt(sum(x * x for x in d))
    for i in range(3):
        T[i][3] += 0.01 * d[i] / n
    return T


BOX_414 = box_414()
BOX_413 = ur5e_pose([0.5, -0.7, 0.06, -0.9, 1.2, 0.4])  # the previous box: reachable, elbow almost straight
_runs = {}


def run(name, T):
    """Each solve once per test run (they are the slow part)."""
    if name not in _runs:
        _runs[name] = reach(T, Q_NOW)
    return _runs[name]


def test_draw_reaching_for_box_414():
    q, errors, path = run("414", BOX_414)
    frames, ellipsoids = [], []
    for qk in path:
        F = ur5e_frames(qk)
        radii, axes = velocity_ellipsoid(ur5e_jacobian(qk)[:3])
        frames.append(F[1:])
        ellipsoids.append([{"center": translation_of(F[-1]), "axes": axes, "radii": [0.25 * r for r in radii], "label": "velocity"}])
    viz.arm3d(frames, local=False, axes=True, ellipsoids=ellipsoids, name="edge", target=BOX_414, scale=0.07, labels=LABELS,
              title="Box #414, at the edge of reach",
              caption="YOUR reach(), one iteration per frame: the arm stretches towards the target and settles. The ellipsoid flattens.")
    viz.chart("Position error, box #414", list(range(len(errors))), [e[1] for e in errors], label="|v| (m)",
              x_label="iteration", y_label="error (m)", log=True)
    assert frames


def test_clamp_step():
    assert clamp_step([0.1, -0.05, 0.02]) == [0.1, -0.05, 0.02], "a small step is left alone"
    got = clamp_step([0.1, -0.5, 0.3], 0.2)
    assert max(abs(a - b) for a, b in zip(got, [0.04, -0.2, 0.12])) < 1e-12, (
        f"scale the whole step so the biggest joint moves 0.2 rad (keeping its direction): (0.04, -0.2, 0.12), got {got}")


def test_box_413_is_still_reached():
    q, errors, _ = run("413", BOX_413)
    assert max(errors[-1]) < 1e-6, f"box #413 is reachable: the error must go under 1e-6, it ended at {max(errors[-1]):.2e}"


def test_no_wild_swings_for_box_414():
    q, errors, path = run("414", BOX_414)
    worst = max(max(abs(a - b) for a, b in zip(p1, p2)) for p1, p2 in zip(path, path[1:]))
    assert worst <= MAX_STEP + 1e-9, (
        f"one iteration moved a joint by {worst:.2f} rad (limit {MAX_STEP} rad): the log's 'joint 3 -9.10 rad in ONE step'. "
        "Damp the step, then clamp it")
    assert all(abs(x) < 2 * math.pi for x in q), f"the joints must stay within one turn, ended at {[round(x, 2) for x in q]}"


def test_box_414_settles_as_close_as_it_can():
    q, errors, _ = run("414", BOX_414)
    tail = [e[1] for e in errors[-15:]]
    assert max(tail) - min(tail) < 1e-3, f"the error must settle, not oscillate: last values {', '.join(f'{x:.3f}' for x in tail)}"
    miss = math.dist(translation_of(ur5e_pose(q)), translation_of(BOX_414))
    assert miss < 0.015, f"the box is 1 cm out of reach: the flange should end within 1.5 cm of it, it is {miss * 100:.1f} cm away"
