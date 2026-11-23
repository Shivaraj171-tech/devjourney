"""The 3-DOF RRR arm (kin/rrr.py) written as a DH table.

Columns: (a, alpha, d, theta_offset), metres and radians, standard DH.
"""
import math

from kin.dh import fk_dh_frames
from kin.rrr import A2, A3, D1

ARM3_DH = [
    # a     alpha        d     offset
    [0.0, math.pi / 2, D1, 0.0],   # 1 base yaw: lift D1 along z0, twist z1 horizontal
    [A2, 0.0, 0.0, 0.0],           # 2 shoulder: walk the upper arm along x2
    [A3, 0.0, 0.0, 0.0],           # 3 elbow: walk the forearm along x3
]


def arm3_frames(q):
    """Every DH frame of the 3-DOF arm, base first."""
    return fk_dh_frames(ARM3_DH, q)
