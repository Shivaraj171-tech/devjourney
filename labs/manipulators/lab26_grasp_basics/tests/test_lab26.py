import numpy as np
import pytest

from labs.manipulators.toolbox.sim import mujoco_available

needs_mujoco = pytest.mark.skipif(not mujoco_available(), reason="optional: needs mujoco")
MASS, SQUEEZE = 0.2, 5.0
MU_MIN = MASS * 9.81 / (2 * SQUEEZE)   # 0.1962


def test_contact_frame(impl, rng):
    for n in (rng.normal(size=3), [0, 0, 1.0], [1.0, 0, 0]):
        F = np.asarray(impl.contact_frame(n))
        np.testing.assert_allclose(F.T @ F, np.eye(3), atol=1e-12, err_msg="columns orthonormal")
        np.testing.assert_allclose(F[:, 2], np.asarray(n) / np.linalg.norm(n), atol=1e-12,
                                   err_msg="third column is the unit normal")
        assert np.linalg.det(F) == pytest.approx(1.0), "right-handed (t1 x t2 = n)"


def test_friction_cone(impl):
    n = [0, 0, 1.0]
    assert impl.in_friction_cone([0.3, 0.0, 1.0], n, 0.5), "|f_t| = 0.3 <= 0.5 * 1"
    assert not impl.in_friction_cone([0.6, 0.0, 1.0], n, 0.5), "|f_t| = 0.6 > 0.5 * 1: slips"
    assert not impl.in_friction_cone([0.0, 0.0, -1.0], n, 0.5), "contacts can push, never pull"
    assert impl.in_friction_cone([0.3, 0.4, 1.0], n, 0.5), "|f_t| = 0.5 on the boundary still holds"
    edges = np.asarray(impl.friction_cone_edges([1.0, 1.0, 0.0], 0.4, k=6))
    nn = np.array([1.0, 1.0, 0.0]) / np.sqrt(2)
    assert edges.shape == (6, 3)
    np.testing.assert_allclose(edges @ nn, np.ones(6), atol=1e-12, err_msg="unit normal component")
    np.testing.assert_allclose(np.linalg.norm(edges - np.outer(edges @ nn, nn), axis=1), 0.4 * np.ones(6),
                               atol=1e-12, err_msg="tangential part = mu: the edges lie ON the cone")
    assert np.linalg.norm(edges.sum(axis=0) / 6 - nn) < 1e-12, "edges spread evenly around the normal"


def test_wrenches_and_grasp_matrix(impl, rng):
    np.testing.assert_allclose(impl.contact_wrench([1.0, 0, 0], [0, 0, 2.0]), [0, -2.0, 0, 0, 0, 2.0],
                               atol=1e-12, err_msg="(m, f) = (p x f, f)")
    pts, fs = rng.normal(size=(3, 3)), rng.normal(size=(3, 3))
    G = np.asarray(impl.grasp_matrix(pts))
    assert G.shape == (6, 9), "6 x 3k for k point contacts"
    np.testing.assert_allclose(G @ fs.ravel(), sum(impl.contact_wrench(p, f) for p, f in zip(pts, fs)),
                               atol=1e-12, err_msg="G [f1; f2; f3] = sum of contact wrenches")
    np.testing.assert_allclose(impl.gravity_wrench(2.0, [0.1, 0, 0]), [0, 2 * 9.81 * 0.1, 0, 0, 0, -2 * 9.81],
                               atol=1e-12, err_msg="weight -m g z at the COM, as a wrench")


def test_two_finger_threshold(impl):
    assert impl.min_friction_two_finger(MASS, SQUEEZE) == pytest.approx(MU_MIN), "mu_min = m g / (2 N)"
    F = np.asarray(impl.two_finger_forces(MASS, SQUEEZE))
    pts = np.array([[-0.02, 0, 0], [0.02, 0, 0]])
    total = np.asarray(impl.grasp_matrix(pts)) @ F.ravel() + impl.gravity_wrench(MASS)
    np.testing.assert_allclose(total, np.zeros(6), atol=1e-12,
                               err_msg="the two finger forces must cancel the weight: zero net wrench")
    normals = [[1.0, 0, 0], [-1.0, 0, 0]]   # pointing INTO the box from each finger
    for mu, ok in ((1.05 * MU_MIN, True), (0.95 * MU_MIN, False)):
        held = all(impl.in_friction_cone(f, n, mu) for f, n in zip(F, normals))
        assert held == ok, f"mu = {mu:.3f}: those forces are {'inside' if ok else 'outside'} the cones"


@needs_mujoco
def test_mujoco_pinch_holds_above_threshold(impl):
    drop, contacts = impl.pinch_experiment(1.1 * MU_MIN, SQUEEZE, MASS)
    assert abs(drop) < 1e-3, f"mu = 1.1 mu_min must hold the box (it moved {drop * 1e3:.2f} mm in 1 s)"
    assert len(contacts) >= 2, "both pads must touch the box"
    total = sum(np.asarray(f) for _, f in contacts)
    np.testing.assert_allclose(total, [0, 0, MASS * 9.81], atol=2e-3,
                               err_msg="contact forces on a held box must add up to its weight, upwards")
    normal = sum(abs(f[0]) for _, f in contacts) / 2
    assert normal == pytest.approx(SQUEEZE, rel=0.01), "each finger presses with the squeeze force N"
    for _, f in contacts:
        assert np.linalg.norm(f[1:]) <= MU_MIN * abs(f[0]) * 1.01, "a held contact stays inside its cone"


@needs_mujoco
def test_mujoco_pinch_slips_below_threshold(impl):
    drop, _ = impl.pinch_experiment(0.9 * MU_MIN, SQUEEZE, MASS)
    assert drop > 0.5, f"mu = 0.9 mu_min must let the box fall (it moved {drop * 1e3:.1f} mm)"
    mu = 0.8 * MU_MIN
    drop, contacts = impl.pinch_experiment(mu, SQUEEZE, MASS, hold=0.05)
    assert drop > 0.005 and contacts, "50 ms into the slip the box is sliding but still touching"
    for _, f in contacts:
        assert np.linalg.norm(f[1:]) == pytest.approx(mu * abs(f[0]), rel=0.01), \
            "a SLIDING contact sits on the cone boundary: |f_t| = mu f_n (Coulomb)"
