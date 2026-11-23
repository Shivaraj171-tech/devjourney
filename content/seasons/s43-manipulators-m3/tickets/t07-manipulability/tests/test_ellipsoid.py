import math

from lab import viz

from kin.arm3_dh import arm3_frames
from vel.ellipsoid import manipulability, sym_eig, velocity_ellipsoid
from vel.geometric import geometric_jacobian, origin
from vel.linalg import det

POSES = [[0.4, 0.5, -0.9], [-1.1, 1.2, 0.6], [2.0, -0.3, 1.4]]
SHOW = 0.4  # draw the ellipsoid at 0.4 x its size (m/s per rad/s)


def Jv_at(q):
    return geometric_jacobian(arm3_frames(q))[:3]


def JJt(J):
    return [[sum(J[i][k] * J[j][k] for k in range(len(J[0]))) for j in range(3)] for i in range(3)]


def test_draw_the_ellipsoid_flattening():
    frames, ellipsoids, w = [], [], []
    for k in range(41):  # the elbow straightens: q3 from 1.8 rad to 0.01 rad
        q = [0.3, 0.4, 1.8 - 1.79 * k / 40]
        F = arm3_frames(q)
        radii, axes = velocity_ellipsoid(Jv_at(q))
        frames.append(F[1:])
        ellipsoids.append([{"center": origin(F[-1]), "axes": axes, "radii": [SHOW * r for r in radii], "label": "velocity"}])
        w.append(manipulability(Jv_at(q)))
    viz.arm3d(frames, local=False, axes=True, ellipsoids=ellipsoids, name="ellipsoid", scale=0.08,
              labels=["base", "frame 1", "frame 2", "wrist"], title="The velocity ellipsoid goes flat",
              caption="Every wrist velocity that joint speeds |qdot| <= 1 can make (x 0.4), from YOUR velocity_ellipsoid. Stretched out, it can't move along the arm.")
    viz.chart("Manipulability", list(range(41)), w, label="w = sqrt(det(J J^T))", x_label="frame", y_label="w", hline=0.0)
    assert len(frames) == 41


def test_sym_eig_is_given_and_works():
    values, V = sym_eig([[2.0, 1.0, 0.0], [1.0, 2.0, 0.0], [0.0, 0.0, 5.0]])
    assert [round(v, 9) for v in values] == [5.0, 3.0, 1.0], values


def test_radii_are_the_singular_values():
    for q in POSES:
        J = Jv_at(q)
        radii, axes = velocity_ellipsoid(J)
        A = JJt(J)
        trace = A[0][0] + A[1][1] + A[2][2]
        assert abs(sum(r * r for r in radii) - trace) < 1e-9, (
            f"at q = {q}: the radii squared must add up to trace(J J^T) = {trace:.5f}, got {sum(r * r for r in radii):.5f} "
            f"(radii {[round(r, 4) for r in radii]}). Are your radii sigma, or sigma squared?")
        assert radii == sorted(radii, reverse=True), "radii biggest first"
        for k in range(3):  # each axis: J J^T a = r^2 a
            a = [axes[i][k] for i in range(3)]
            Aa = [sum(A[i][j] * a[j] for j in range(3)) for i in range(3)]
            assert max(abs(Aa[i] - radii[k] ** 2 * a[i]) for i in range(3)) < 1e-9, f"axis {k + 1} (a COLUMN of axes) must satisfy J J^T a = r^2 a"


def test_manipulability_is_the_volume_measure():
    for q in POSES:
        J = Jv_at(q)
        radii, _ = velocity_ellipsoid(J)
        want = abs(det(J))
        assert abs(manipulability(J) - want) < 1e-9, f"for a square J, sqrt(det(J J^T)) = |det J| = {want:.5f}, got {manipulability(J):.5f}"
        assert abs(manipulability(J) - radii[0] * radii[1] * radii[2]) < 1e-9, "w is the product of the radii"


def test_stretched_out_it_goes_flat_along_the_arm():
    q = [0.3, 0.4, 0.0]
    F = arm3_frames(q)
    radii, axes = velocity_ellipsoid(Jv_at(q))
    assert radii[2] < 1e-6, f"stretched out (q3 = 0), the smallest radius must be 0, got {radii[2]:.2e}"
    assert manipulability(Jv_at(q)) < 1e-6, "and the manipulability 0"
    arm = [e - s for e, s in zip(origin(F[3]), origin(F[1]))]
    n = math.sqrt(sum(x * x for x in arm))
    flat = [axes[i][2] for i in range(3)]
    assert abs(abs(sum(a * b for a, b in zip(arm, flat))) / n - 1) < 1e-6, "the lost direction is ALONG the arm (shoulder to wrist)"
