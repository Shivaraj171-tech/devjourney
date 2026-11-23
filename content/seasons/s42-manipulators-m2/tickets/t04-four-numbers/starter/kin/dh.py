"""Denavit-Hartenberg forward kinematics (the STANDARD, distal convention).

A DH table has one row per joint: (a, alpha, d, theta_offset), and joint i's transform is

    T_(i-1)_i = Rz(theta_i) Tz(d_i) Tx(a_i) Rx(alpha_i),   theta_i = q_i + theta_offset_i

  theta: turn about the OLD z axis (the joint's axis, for a revolute joint)
  d:     slide along the old z axis
  a:     walk along the NEW x axis (the common normal) to the next joint axis
  alpha: twist about that new x axis, from the old z axis to the next one
"""
from rigid.frames import chain
from rigid.mat import identity
from rigid.rotations import rot_x, rot_z
from rigid.transform import T_mul
from kin.joints import trans, turn


def dh_transform(a, alpha, d, theta):
    """One DH row as a 4x4: turn theta about z, slide d along z, walk a along x, twist alpha about x."""
    return chain(turn(rot_z(theta)), trans(0.0, 0.0, d), trans(a, 0.0, 0.0), turn(rot_x(alpha)))


def fk_dh_frames(table, q):
    """[T_0_0 = I, T_0_1, ..., T_0_n]: every DH frame in the base frame."""
    if len(q) != len(table):
        raise ValueError(f"the table has {len(table)} joints, got {len(q)} joint values")
    frames = [identity(4)]
    for (a, alpha, offset, d), qi in zip(table, q):
        frames.append(T_mul(frames[-1], dh_transform(a, alpha, d, qi + offset)))
    return frames


def fk_dh(table, q):
    """T_0_n: the last frame's pose in the base frame."""
    return fk_dh_frames(table, q)[-1]
