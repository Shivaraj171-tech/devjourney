import numpy as np
import pytest

from labs.manipulators.toolbox import UR5_DH, exp_so3
from labs.manipulators.toolbox.sim import KinematicSim, MujocoSim, mujoco_available

Q0 = np.array([0.0, -1.2, 1.5, -1.9, -1.57, 0.0])  # elbow-up, away from singularities
MOVE = np.array([0.15, 0.20, -0.10])               # 27 cm diagonal move


def test_quintic_time_scaling(impl):
    s0, v0 = impl.quintic_time_scaling(0.0, 2.0)
    s1, v1 = impl.quintic_time_scaling(2.0, 2.0)
    sm, vm = impl.quintic_time_scaling(1.0, 2.0)
    assert (s0, s1) == pytest.approx((0.0, 1.0)), "s goes from 0 to 1"
    assert (v0, v1) == pytest.approx((0.0, 0.0)), "starts and ends at rest"
    assert sm == pytest.approx(0.5) and vm == pytest.approx(15 / 8 / 2.0), "peak speed 15/(8T) at T/2"
    h = 1e-6
    num = (impl.quintic_time_scaling(0.7 + h, 2.0)[0] - impl.quintic_time_scaling(0.7 - h, 2.0)[0]) / (2 * h)
    assert impl.quintic_time_scaling(0.7, 2.0)[1] == pytest.approx(num, rel=1e-6), "sdot = ds/dt"
    assert impl.quintic_time_scaling(3.0, 2.0) == pytest.approx((1.0, 0.0)), "hold after T"


def test_straight_line_reference(impl):
    p, v = impl.straight_line_reference([0, 0, 0], [1, 2, 2], 1.0, 2.0)
    np.testing.assert_allclose(p, [0.5, 1.0, 1.0])
    np.testing.assert_allclose(v, np.array([1, 2, 2]) * 15 / 16)


def test_dls_inverse(impl, rng):
    J = rng.normal(size=(6, 6))
    np.testing.assert_allclose(impl.dls_inverse(J, 0.0), np.linalg.inv(J), atol=1e-8,
                               err_msg="with zero damping and full rank, DLS = the inverse")
    Js = np.diag([1.0, 1.0, 1.0, 1.0, 1.0, 1e-9])  # singular-ish
    qd = np.asarray(impl.dls_inverse(Js, 0.05)) @ np.ones(6)
    assert np.abs(qd).max() < 30, "damping must keep joint speeds bounded near a singularity"


def test_pose_error(impl):
    T = np.eye(4)
    Td = np.eye(4)
    Td[:3, :3] = exp_so3([0, 0, 0.2])
    Td[:3, 3] = [0.1, 0, 0]
    np.testing.assert_allclose(impl.pose_error(Td, T), [0.1, 0, 0, 0, 0, 0.2], atol=1e-12,
                               err_msg="[p_des - p ; log(R_des R^T)]")


def test_path_deviation(impl):
    d = impl.path_deviation([[0.5, 1, 0], [2, 0, 0], [-1, 0, 0]], [0, 0, 0], [1, 0, 0])
    np.testing.assert_allclose(d, [1, 1, 1], err_msg="distance to the SEGMENT, not the line")


def _run(impl, sim, settle=0.5):
    p0 = sim.ee_pose()[:3, 3].copy()
    log = impl.run_straight_line(sim, p0 + MOVE, settle=settle)
    for key in ("t", "p", "q", "rot_err", "p0", "p1"):
        assert key in log, f"run_straight_line must return key {key!r}"
    dev = np.asarray(impl.path_deviation(log["p"], log["p0"], log["p1"]))
    final = np.linalg.norm(np.asarray(log["p"])[-1] - (p0 + MOVE))
    return log, dev.max(), final


def test_straight_line_on_kinematic_robot(impl):
    log, dev, final = _run(impl, KinematicSim(UR5_DH, Q0))
    assert len(log["t"]) == 251, "log steps 0..250 inclusive (2.5 s at dt = 0.01)"
    assert dev < 5e-4, f"max deviation from the line {dev * 1e3:.2f} mm (want < 0.5 mm)"
    assert final < 5e-4, f"final position error {final * 1e3:.2f} mm (want < 0.5 mm)"
    assert np.max(log["rot_err"]) < np.radians(0.5), "orientation must be held"


@pytest.mark.skipif(not mujoco_available(), reason="optional: needs mujoco")
def test_straight_line_in_mujoco(impl):
    # settle 2 s: a closed loop that slowly rings up would show here, not in a short run
    log, dev, final = _run(impl, MujocoSim(UR5_DH, Q0), settle=2.0)
    assert dev < 1e-3, (f"MuJoCo: max deviation {dev * 1e3:.2f} mm (want < 1 mm). Is the feedback "
                        "term using the MEASURED pose sim.ee_pose() each step?")
    assert final < 2e-4, (f"MuJoCo: error after a 2 s hold is {final * 1e3:.3f} mm (want < 0.2 mm); "
                          "if it grows with time, your gain is too high for the servos")
    assert np.max(log["rot_err"]) < np.radians(0.5)
