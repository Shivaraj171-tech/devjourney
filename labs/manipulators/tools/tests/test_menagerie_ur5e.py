"""Optional checks of the MuJoCo Menagerie UR5e against our UR5E_DH, and the capstone replay demo.

Skipped unless MuJoCo is installed AND the model was downloaded with
`python labs/manipulators/tools/fetch_menagerie_ur5e.py`. Run with

    python -m pytest labs/manipulators/tools/tests
"""

import numpy as np
import pytest

from labs.manipulators.toolbox import fk_dh
from labs.manipulators.toolbox.menagerie import FLANGE_SITE, load_menagerie_ur5e
from labs.manipulators.toolbox.robots import UR5E_DH

LOADED = load_menagerie_ur5e()
pytestmark = pytest.mark.skipif(
    LOADED is None, reason="optional: needs mujoco and the Menagerie UR5e "
                           "(python labs/manipulators/tools/fetch_menagerie_ur5e.py)")


def test_menagerie_kinematics_match_the_official_dh_table():
    import mujoco
    model, data = LOADED
    assert model.nq == 6 and model.nu == 6, "the arm only: six hinges, six position actuators"
    site = model.site(FLANGE_SITE).id
    rng = np.random.default_rng(0)
    for k in range(100):
        q = np.zeros(6) if k == 0 else rng.uniform(-np.pi, np.pi, 6)
        data.qpos[:] = q
        mujoco.mj_kinematics(model, data)
        T = fk_dh(UR5E_DH, q)
        # Menagerie rounds the offsets (0.163 / 0.127 / 0.1 m vs UR's 0.1625 / 0.1333 / 0.0997 / 0.0996)
        np.testing.assert_allclose(data.site_xpos[site], T[:3, 3], atol=2e-3,
                                   err_msg=f"flange position at q = {np.round(q, 2)}")
        np.testing.assert_allclose(data.site_xmat[site].reshape(3, 3)[:, 2], T[:3, 2], atol=1e-6,
                                   err_msg="same approach (z) axis: same joint directions and zero pose")


def test_menagerie_masses_are_not_the_official_ur5e_ones():
    # Documented in toolbox/menagerie.py: Menagerie keeps the older UR5-era inertials, so it is a
    # visual/kinematic model only; the dynamics labs use Universal Robots' UR5e values.
    model, _ = LOADED
    np.testing.assert_allclose(model.body_mass[2:8], [3.7, 8.393, 2.275, 1.219, 1.219, 0.1889])


def test_capstone_replay_on_the_menagerie_ur5e():
    from labs.manipulators.tools.menagerie_ur5e_replay import capstone_reference, replay
    model, data = LOADED
    ref, T = capstone_reference()
    kin = replay(model, data, ref, T, "kinematic", settle=0.0)
    assert np.linalg.norm(kin["flange"] - kin["flange_dh"], axis=1).max() < 2e-3
    servo = replay(model, data, ref, T, "servo", settle=1.0)
    lag = np.abs(servo["q"] - servo["q_ref"])
    assert np.isfinite(servo["q"]).all() and lag.max() < 0.3, "Menagerie's servos follow the plan"
    assert lag[-1].max() < 0.02, "and settle near the final pose (small gravity sag, no gravcomp)"
