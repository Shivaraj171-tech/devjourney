import numpy as np
import pytest

from labs.manipulators.toolbox import (
    ARM3_DH, UR5E_DH, body_screws, fk_body, fk_dh, fk_space, screws_from_dh,
)

M, S = screws_from_dh(UR5E_DH)
B = body_screws(M, S)


def fk(q):
    return fk_space(M, S, q)


def configs(n=8, seed=3):
    rng = np.random.default_rng(seed)
    return [rng.uniform(-np.pi, np.pi, size=6) for _ in range(n)]


def test_space_jacobian_first_column_and_shape(impl):
    J = np.asarray(impl.jacobian_space(S, configs(1)[0]))
    assert J.shape == (6, 6), "J_s is 6 x n"
    np.testing.assert_allclose(J[:, 0], S[:, 0], atol=1e-12,
                               err_msg="column 1 of J_s is always S_1 (nothing moves joint 1's axis)")


def test_space_jacobian_matches_finite_differences(impl):
    for q in configs():
        np.testing.assert_allclose(
            impl.jacobian_space(S, q), impl.numerical_jacobian_space(fk, q), atol=1e-6,
            err_msg="analytic J_s disagrees with the numerical one. If only column 1 matches, "
                    "you're probably using the adjoint AFTER multiplying in joint i")


def test_numerical_jacobian_independent_check(impl):
    # independent check of your numerical Jacobian: twist from a tiny joint motion
    q = configs(1)[0]
    Jn = np.asarray(impl.numerical_jacobian_space(fk, q))
    from labs.manipulators.toolbox import log_se3, transform_inverse
    h = 1e-7
    e = np.zeros(6)
    e[2] = h
    twist = log_se3(fk(q + e) @ transform_inverse(fk(q))) / h
    np.testing.assert_allclose(Jn[:, 2], twist, atol=1e-5,
                               err_msg="numerical_jacobian_space column = vee(dT/dq T^-1)")


def test_body_jacobian(impl):
    for q in configs(5):
        Jb = np.asarray(impl.jacobian_body(B, q))
        np.testing.assert_allclose(Jb[:, -1], B[:, -1], atol=1e-12,
                                   err_msg="last column of J_b is always B_n")
        np.testing.assert_allclose(Jb, impl.numerical_jacobian_body(lambda x: fk_body(M, B, x), q),
                                   atol=1e-6, err_msg="J_b disagrees with finite differences")
        np.testing.assert_allclose(impl.space_to_body_jacobian(fk(q), impl.jacobian_space(S, q)),
                                   Jb, atol=1e-9, err_msg="J_b must equal Ad_{T^-1} J_s")


def test_geometric_jacobian_linear_part_is_dp_dq(impl):
    for q in configs(5):
        Jg = np.asarray(impl.geometric_jacobian(M, S, q))
        assert Jg.shape == (6, 6)
        Jp = impl.numerical_position_jacobian(lambda x: fk(x)[:3, 3], q)
        np.testing.assert_allclose(Jg[:3], Jp, atol=1e-6,
                                   err_msg="top 3 rows of the geometric Jacobian must equal dp/dq")
        np.testing.assert_allclose(Jg[3:], impl.jacobian_space(S, q)[:3], atol=1e-12,
                                   err_msg="bottom 3 rows are the angular velocity part (= top of J_s)")


def test_arm3_geometric_jacobian(impl):
    M3, S3 = screws_from_dh(ARM3_DH)
    q = np.array([0.4, 0.3, -0.9])
    Jp = impl.numerical_position_jacobian(lambda x: fk_dh(ARM3_DH, x)[:3, 3], q)
    np.testing.assert_allclose(np.asarray(impl.geometric_jacobian(M3, S3, q))[:3], Jp, atol=1e-6)


def test_matches_mujoco_mj_jacSite(impl):
    mujoco = pytest.importorskip("mujoco", reason="optional: compare with MuJoCo's mj_jacSite")
    from labs.manipulators.toolbox import dh_to_mjcf
    model = mujoco.MjModel.from_xml_string(dh_to_mjcf(UR5E_DH))
    data = mujoco.MjData(model)
    jacp, jacr = np.zeros((3, model.nv)), np.zeros((3, model.nv))
    for q in configs(5):
        data.qpos[:] = q
        mujoco.mj_forward(model, data)  # mj_kinematics alone does not fill what mj_jac* needs
        mujoco.mj_jacSite(model, data, jacp, jacr, model.site("ee").id)
        np.testing.assert_allclose(impl.geometric_jacobian(M, S, q), np.vstack([jacp, jacr]),
                                   atol=1e-9, err_msg="your geometric Jacobian != MuJoCo's mj_jacSite")
