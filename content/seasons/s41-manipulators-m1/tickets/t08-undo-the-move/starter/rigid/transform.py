"""Homogeneous transforms: a rotation AND a position in one 4x4 matrix.

    T = [[R00, R01, R02, px],
         [R10, R11, R12, py],
         [R20, R21, R22, pz],
         [  0,   0,   0,  1]]

T maps a point written in the box's frame to the same point written in the world frame.
"""
from rigid.mat import matmul, mat_vec, transpose


def make_T(R, p):
    """The 4x4 transform with rotation R (3x3) and translation p (x, y, z)."""
    return [[R[0][0], R[0][1], R[0][2], p[0]],
            [R[1][0], R[1][1], R[1][2], p[1]],
            [R[2][0], R[2][1], R[2][2], p[2]],
            [0.0, 0.0, 0.0, 1.0]]


def rotation_of(T):
    return [row[:3] for row in T[:3]]


def translation_of(T):
    return [T[0][3], T[1][3], T[2][3]]


def T_mul(A, B):
    """Do B's change of frame, then A's: (A B) p = A (B p)."""
    return matmul(A, B)


def T_apply(T, point):
    """Where `point` (x, y, z) ends up: the point gets a 1 on the end, so the translation counts."""
    x, y, z, _ = mat_vec(T, [point[0], point[1], point[2], 1.0])
    return [x, y, z]


def T_inv(T):
    """The inverse transform: [[R^T, -R^T p], [0, 0, 0, 1]] (undo the move, then undo the turn)."""
    return transpose(T)
