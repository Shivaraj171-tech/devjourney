"""Lab 06: Denavit-Hartenberg forward kinematics (standard / distal DH).

DH table rows are (a, alpha, d, theta_offset); joint i adds q_i to theta.
The UR5 table is given in labs/manipulators/toolbox/robots.py (with its source).
"""

from __future__ import annotations

import numpy as np

# TODO: fill in the DH table of the 3-DOF arm described in README ("The 3-DOF arm"):
# base yaw joint, shoulder height 0.30 m, upper arm 0.40 m, forearm 0.30 m.
# One row per joint: [a, alpha, d, theta_offset].
ARM3_DH = None


def dh_transform(a: float, alpha: float, d: float, theta: float) -> np.ndarray:
    """T_{i-1,i} = Rz(theta) Tz(d) Tx(a) Rx(alpha) as one 4x4 matrix."""
    # TODO: multiply out the four elementary transforms (README step 2) or build each and use @.
    raise NotImplementedError("one DH link transform")


def fk_dh_frames(dh, q):
    """[T_00 = I, T_01, ..., T_0n]. Raise ValueError if len(q) != number of rows."""
    # TODO: accumulate T_0i = T_0,i-1 @ dh_transform(a, alpha, d, q_i + offset).
    raise NotImplementedError("all frames along the chain")


def fk_dh(dh, q) -> np.ndarray:
    """End-effector pose T_0n."""
    # TODO
    raise NotImplementedError("end-effector pose")


def arm3_position(q) -> np.ndarray:
    """Closed-form end-effector position of the 3-DOF arm, derived by hand (no matrices!)."""
    # TODO: README step 4. Think "horizontal reach r" and "height z".
    raise NotImplementedError("closed-form position of the 3-DOF arm")
