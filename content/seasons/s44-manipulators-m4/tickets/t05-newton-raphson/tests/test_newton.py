import math

from lab import viz

from ik.newton import newton_position
from kin.arm3_dh import arm3_frames
from vel.geometric import geometric_jacobian, origin

BOX = (0.35, 0.3, 0.55)
Q0 = [0.2, 0.2, 1.2]  # where the arm is now (elbow bent down): the first guess
STEPS = 6  # animation frames between two Newton iterates


def tip(q):
    return origin(arm3_frames(q)[-1])


def jac(q):
    return geometric_jacobian(arm3_frames(q))[:3]


def test_draw_newton_converging():
    q, errors, path = newton_position(tip, jac, BOX, Q0, iters=8)
    frames, arrows = [], []
    for a, b in zip(path, path[1:] + path[-1:]):
        for k in range(STEPS):
            qk = [x + (y - x) * k / STEPS for x, y in zip(a, b)]
            frames.append(arm3_frames(qk)[1:])
            p = tip(qk)
            arrows.append([{"start": p, "vec": [t - x for t, x in zip(BOX, p)], "label": "error"}])
    viz.arm3d(frames, local=False, axes=True, arrows=arrows, name="newton", target=BOX, scale=0.08,
              labels=["base", "frame 1", "frame 2", "wrist"], title="Newton-Raphson, one iterate at a time",
              caption=f"YOUR newton_position from the arm's current pose: {len(path) - 1} steps. The arrow is the error e = target - p(q).")
    viz.chart("Newton error", list(range(len(errors))), errors, label="|e| (m)", x_label="iteration", y_label="error (m)", log=True)
    assert len(frames) >= STEPS


def test_converges_to_the_box():
    q, errors, path = newton_position(tip, jac, BOX, Q0, iters=8)
    got = tip(q)
    assert math.dist(got, BOX) < 1e-10, (
        f"after {len(errors) - 1} Newton steps the wrist is {math.dist(got, BOX):.3g} m from the box "
        f"(errors: {', '.join(f'{e:.2g}' for e in errors)}). Does each step go TOWARDS the target?")
    assert len(errors) <= 7, f"Newton should need at most 6 steps here, used {len(errors) - 1}"


def test_convergence_is_quadratic():
    _, errors, _ = newton_position(tip, jac, BOX, Q0, iters=8)
    assert errors[1] < errors[0], f"the first step must reduce the error: {errors[0]:.3g} -> {errors[1]:.3g}"
    tail = [e for e in errors if e > 1e-12]
    for a, b in zip(tail[-3:], tail[-2:]):
        assert b < 10 * a * a + 1e-12, f"near the solution the error should roughly square each step: {a:.2g} -> {b:.2g}"


def test_stops_as_soon_as_it_is_close():
    _, errors, path = newton_position(tip, jac, tip([0.4, 0.5, -0.9]), [0.4, 0.5, -0.9], iters=8)
    assert len(errors) == 1 and errors[0] < 1e-12, "starting ON the target: no step at all"
