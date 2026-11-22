import numpy as np

from labs.manipulators.toolbox import UR5_DH, geometric_jacobian, screws_from_dh

M, S = screws_from_dh(UR5_DH)
L1, L2 = 1.0, 0.8


def J2R(t1, t2):
    """Planar 2R position Jacobian (derived in the README)."""
    return np.array([[-L1 * np.sin(t1) - L2 * np.sin(t1 + t2), -L2 * np.sin(t1 + t2)],
                     [L1 * np.cos(t1) + L2 * np.cos(t1 + t2), L2 * np.cos(t1 + t2)]])


def test_singular_values_and_rank(impl):
    J = np.diag([3.0, 2.0, 0.0])
    np.testing.assert_allclose(impl.singular_values(J), [3, 2, 0])
    assert impl.numerical_rank(J) == 2
    assert impl.is_singular(J)
    assert not impl.is_singular(np.eye(3))
    assert not impl.is_singular(np.ones((2, 3)) + np.eye(2, 3)), "a full-row-rank 2x3 is not singular"


def test_condition_number(impl):
    assert impl.condition_number(np.diag([4.0, 2.0])) == 2.0
    assert impl.condition_number(np.diag([1.0, 0.0])) == float("inf"), \
        "exactly singular -> inf (don't divide by zero)"


def test_planar_2r_manipulability_closed_form(impl):
    for t2 in [0.3, 1.0, np.pi / 2, 2.5]:
        w = impl.manipulability(J2R(0.7, t2))
        assert abs(w - L1 * L2 * abs(np.sin(t2))) < 1e-12, \
            "for a planar 2R, sqrt(det(J J^T)) = |det J| = l1 l2 |sin t2|"
    assert impl.manipulability(J2R(0.7, 0.0)) < 1e-12, "stretched out (t2 = 0) is singular"


def test_velocity_ellipsoid(impl):
    J = J2R(0.0, np.pi / 2)  # elbow at 90 deg
    lengths, axes = impl.velocity_ellipsoid(J)
    lengths, axes = np.asarray(lengths), np.asarray(axes)
    assert lengths.shape == (2,) and axes.shape == (2, 2)
    assert lengths[0] >= lengths[1], "sort semi-axes largest first"
    assert abs(np.prod(lengths) - impl.manipulability(J)) < 1e-12, \
        "ellipse area/pi = product of semi-axes = manipulability"
    np.testing.assert_allclose(axes.T @ axes, np.eye(2), atol=1e-12, err_msg="axes are orthonormal")
    # every column of J (a unit joint-speed vector) must lie inside the ellipse
    for qd in np.eye(2):
        v = J @ qd
        c = axes.T @ v / lengths
        assert c @ c <= 1 + 1e-9


def test_force_ellipsoid_is_dual(impl):
    J = J2R(0.2, 0.6)
    lv, av = impl.velocity_ellipsoid(J)
    lf, af = impl.force_ellipsoid(J)
    np.testing.assert_allclose(np.asarray(lf) * np.asarray(lv), 1.0, atol=1e-12,
                               err_msg="force semi-axes are 1/sigma: good at speed = bad at force")
    np.testing.assert_allclose(np.abs(np.asarray(af).T @ np.asarray(av)), np.eye(2), atol=1e-12)


def test_lost_directions_at_stretched_2r(impl):
    U0, V0 = impl.lost_directions(J2R(0.0, 0.0))
    U0, V0 = np.asarray(U0), np.asarray(V0)
    assert U0.shape == (2, 1) and V0.shape == (2, 1), "one lost direction for a stretched 2R arm"
    np.testing.assert_allclose(np.abs(U0[:, 0]), [1, 0], atol=1e-9,
                               err_msg="stretched along x: the hand can't move along x (radially)")
    np.testing.assert_allclose(J2R(0, 0) @ V0, 0, atol=1e-12,
                               err_msg="the joint motion in V must produce zero hand velocity")


def test_ur5_det_formula_matches_numeric(impl):
    rng = np.random.default_rng(4)
    for _ in range(10):
        q = rng.uniform(-np.pi, np.pi, 6)
        d = np.linalg.det(geometric_jacobian(M, S, q))
        assert abs(impl.ur5_jacobian_det(q) - d) < 1e-10, "closed-form det disagrees with numpy"


def test_ur5_singularities_found_by_rank(impl):
    base = np.array([0.3, -1.0, 1.2, -0.9, 0.8, 0.2])
    J = geometric_jacobian(M, S, base)
    assert not impl.is_singular(J) and impl.classify_ur5_singularity(base) == set()
    elbow = base.copy()
    elbow[2] = 0.0
    wrist = base.copy()
    wrist[4] = 0.0
    for q, kind in [(elbow, "elbow"), (wrist, "wrist")]:
        J = geometric_jacobian(M, S, q)
        assert impl.numerical_rank(J) == 5, f"{kind} singularity should drop the rank to 5"
        assert impl.condition_number(J) > 1e8
        assert kind in impl.classify_ur5_singularity(q)


def test_ur5_shoulder_singularity(impl):
    a2, a3, d5 = UR5_DH[1, 0], UR5_DH[2, 0], UR5_DH[4, 2]
    q2, q3 = np.pi / 2, 0.1
    s234 = -(a2 * np.cos(q2) + a3 * np.cos(q2 + q3)) / d5
    q4 = np.arcsin(s234) - q2 - q3  # wrist centre placed on the base axis
    q = np.array([0.0, q2, q3, q4, 0.7, 0.0])
    assert impl.classify_ur5_singularity(q) == {"shoulder"}
    assert impl.is_singular(geometric_jacobian(M, S, q))
