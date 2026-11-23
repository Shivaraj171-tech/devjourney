import math

from lab import viz

from ik.dls import dls_step, ik_dls
from kin.arm3_dh import arm3_frames
from vel.ellipsoid import velocity_ellipsoid
from vel.geometric import geometric_jacobian, origin
from vel.linalg import solve

SHOULDER = (0.0, 0.0, 0.3)
_d = (0.6, 0.5, 0.4)
_n = math.sqrt(sum(x * x for x in _d))
TOO_FAR = [SHOULDER[i] + 0.75 * _d[i] / _n for i in range(3)]  # 0.75 m from the shoulder; the arm reaches 0.7
Q0 = [0.3, 0.5, 1.0]
LAMBDA = 0.05


def tip(q):
    return origin(arm3_frames(q)[-1])


def jac(q):
    return geometric_jacobian(arm3_frames(q))[:3]


def plain_newton_errors(target, q, iters):
    """Byte's original plan, for the chart: undamped Newton steps."""
    errors = []
    for _ in range(iters + 1):
        e = [t - x for t, x in zip(target, tip(q))]
        errors.append(math.sqrt(sum(x * x for x in e)))
        try:
            q = [a + b for a, b in zip(q, solve(jac(q), e))]
        except ValueError:
            break
    return errors


def test_draw_damping_at_the_edge():
    q, errors, steps = ik_dls(tip, jac, TOO_FAR, Q0, lam=LAMBDA, iters=24)
    path, qq = [list(Q0)], list(Q0)
    for _ in range(len(steps)):
        e = [t - x for t, x in zip(TOO_FAR, tip(qq))]
        qq = [a + b for a, b in zip(qq, dls_step(jac(qq), e, LAMBDA))]
        path.append(qq)
    frames, ellipsoids = [], []
    for qk in path:
        F = arm3_frames(qk)
        radii, axes = velocity_ellipsoid(jac(qk))
        frames.append(F[1:])
        ellipsoids.append([{"center": origin(F[-1]), "axes": axes, "radii": [0.3 * r for r in radii], "label": "velocity"}])
    viz.arm3d(frames, local=False, axes=True, ellipsoids=ellipsoids, name="dls", target=TOO_FAR, scale=0.08,
              labels=["base", "frame 1", "frame 2", "wrist"], title="Reaching for a box just out of reach",
              caption="YOUR dls_step, one iterate per frame: the arm stretches as far as it can and settles. The ellipsoid goes flat.")
    viz.chart("IK error at the edge", list(range(len(errors))), errors, label="damped (yours)", x_label="iteration", y_label="error (m)")
    plain = plain_newton_errors(TOO_FAR, list(Q0), 24)
    viz.chart("IK error at the edge", list(range(len(plain))), plain, label="plain Newton")
    assert frames


def test_dls_step_on_a_known_matrix():
    dq = dls_step([[1.0, 0.0], [0.0, 0.01]], [1.0, 1.0], 0.1)
    want = [1 / 1.01, 0.01 / (0.0001 + 0.01)]
    assert max(abs(a - b) for a, b in zip(dq, want)) < 1e-9, (
        f"J = diag(1, 0.01), e = (1, 1), λ = 0.1: dq = J^T (J J^T + λ² I)^-1 e = {[round(x, 4) for x in want]}, "
        f"got {[round(x, 4) for x in dq]}. Plain Newton would ask joint 2 for 100 rad")


def test_steps_stay_small_at_the_edge():
    _, _, steps = ik_dls(tip, jac, TOO_FAR, Q0, lam=LAMBDA, iters=24)
    assert max(steps) < 1.0, f"near the singularity every step must stay under 1 rad, the biggest was {max(steps):.2f} rad"


def test_settles_as_close_as_it_can():
    _, errors, _ = ik_dls(tip, jac, TOO_FAR, Q0, lam=LAMBDA, iters=24)
    tail = errors[-10:]
    assert max(tail) - min(tail) < 1e-4, f"the last 10 errors must settle, not oscillate: {', '.join(f'{e:.3f}' for e in tail)}"
    assert abs(errors[-1] - 0.05) < 0.008, f"the box is 5 cm out of reach: the best is about 0.05 m away, got {errors[-1]:.3f} m"


def test_still_exact_when_reachable():
    box = (0.35, 0.3, 0.55)
    q, errors, _ = ik_dls(tip, jac, box, [0.2, 0.2, 1.2], lam=LAMBDA, iters=40)
    assert errors[-1] < 1e-8, f"a reachable box far from singularities: damped steps still converge, got {errors[-1]:.2e} m"
