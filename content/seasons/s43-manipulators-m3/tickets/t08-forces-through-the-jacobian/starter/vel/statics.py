"""Statics: the joint torques that hold a force at the gripper, tau = J^T F.

Power in = power out. The motors put in tau . qdot; the gripper puts F . v into the box,
and v = J qdot. For every qdot:  tau . qdot = F . (J qdot) = (J^T F) . qdot, so

    tau = J^T F

The same Jacobian maps speeds OUT to the gripper and forces BACK to the joints.
With a 6 x n geometric Jacobian [Jv; Jw], F is a wrench (force fx, fy, fz, moment mx, my, mz).
"""
from rigid.mat import mat_vec, transpose
from kin.arm3_dh import arm3_frames
from vel.geometric import geometric_jacobian

G = 9.81  # m/s^2


def joint_torques(J, F):
    """tau = J^T F (J: m x n rows, F: m numbers): one torque per joint."""
    return mat_vec(J, F)


def hold_box_torques(q, mass):
    """Torques for the 3-DOF arm (kin/arm3_dh.py) to hold a box of `mass` kg still.

    Gravity pulls the box down with mass * G newtons, so the gripper must push UP on it:
    F = (0, 0, +mass * G), and only the linear rows Jv matter.
    """
    Jv = geometric_jacobian(arm3_frames(q))[:3]
    return joint_torques(Jv, [0.0, 0.0, mass * G])
