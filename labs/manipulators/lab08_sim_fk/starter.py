"""Lab 08: build an MJCF model from a DH table and validate your FK against MuJoCo.

Needs `pip install mujoco` (see labs/manipulators/README.md). Everything here runs
headless: no window, no OpenGL. Only kinematics is used (mj_kinematics).
"""

from __future__ import annotations

import numpy as np

from labs.manipulators.toolbox import (  # noqa: F401
    fk_dh, log_so3, make_transform, matrix_to_quat, rot_x, rot_z,
)


def _fmt(x) -> str:
    """Numbers -> space-separated string with full precision, for MJCF attributes."""
    return " ".join(f"{float(v):.17g}" for v in np.ravel(x))


def link_constant(a, alpha, d) -> np.ndarray:
    """The q-independent part of a DH link: Tz(d) Tx(a) Rx(alpha), as a 4x4."""
    # TODO
    raise NotImplementedError("constant part of one DH link")


def dh_to_mjcf(dh, name: str = "arm") -> str:
    """Return an MJCF XML string for the revolute arm described by ``dh``.

    Required structure (the tests rely on it):
      * nested bodies link1 ... linkn, body i holds hinge joint "j{i}" with axis="0 0 1"
      * body 1 sits at the world origin rotated by Rz(offset_1);
        body i (i > 1) sits, in its parent, at link_constant(row i-1) @ Rz(offset_i)
      * every body needs some mass (e.g. a small sphere geom) so the model can be simulated
      * a site named "ee" in body n at link_constant(row n)
    Use pos="x y z" and quat="w x y z" (matrix_to_quat gives w-first). See README step 3.
    """
    # TODO: build a list of XML lines; open n nested <body> tags, then close them.
    raise NotImplementedError("generate the MJCF")


def load_model(xml: str):
    """(MjModel, MjData) from an XML string."""
    # TODO: mujoco.MjModel.from_xml_string(xml) and mujoco.MjData(model)
    raise NotImplementedError("compile the model")


def sim_site_pose(model, data, q, site: str = "ee") -> np.ndarray:
    """4x4 world pose of a site after setting qpos = q and running mujoco.mj_kinematics."""
    # TODO: data.qpos[:] = q; mujoco.mj_kinematics(model, data);
    #       data.site(site).xpos (3,) and data.site(site).xmat (9,, row-major) -> 4x4.
    raise NotImplementedError("read the site pose from MuJoCo")


def pose_error(T_a, T_b):
    """(position error [m], rotation error [rad]) between two poses."""
    # TODO: |p_a - p_b| and the angle of R_a^T R_b (log_so3 gives a rotation vector).
    raise NotImplementedError("pose distance")


def compare_with_sim(dh, n_samples: int = 50, seed: int = 0):
    """Worst (position, rotation) error between fk_dh and MuJoCo at random q in [-pi, pi]."""
    # TODO
    raise NotImplementedError("FK vs simulator at random configurations")
