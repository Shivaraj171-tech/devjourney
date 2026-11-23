"""Rotations in 3D about the x, y and z axes, and a check that a matrix is a rotation.

Right-handed axes: point your right thumb along the axis, your fingers curl the
positive way. Angles are in radians.
"""
import math

from rigid.mat import identity, matmul, transpose


def rot_x(theta):
    """Turn about the x axis: y goes towards z."""
    c, s = math.cos(theta), math.sin(theta)
    return [[1.0, 0.0, 0.0],
            [0.0, c, -s],
            [0.0, s, c]]


def rot_y(theta):
    """Turn about the y axis: z goes towards x."""
    c, s = math.cos(theta), math.sin(theta)
    return [[c, 0.0, s],
            [0.0, 1.0, 0.0],
            [-s, 0.0, c]]


def rot_z(theta):
    """Turn about the z axis: x goes towards y."""
    c, s = math.cos(theta), math.sin(theta)
    return [[c, -s, 0.0],
            [s, c, 0.0],
            [0.0, 0.0, 1.0]]


def det3(R):
    """The determinant of a 3x3 matrix (expanding along the first row)."""
    return (R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1])
            - R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0])
            + R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0]))


def is_rotation(R, tol=1e-6):
    """True if R is a proper rotation: orthonormal (R^T R = I) AND det(R) = +1."""
    RtR = matmul(transpose(R), R)
    I = identity(3)
    orthonormal = all(abs(RtR[i][j] - I[i][j]) <= tol for i in range(3) for j in range(3))
    return orthonormal and abs(det3(R) - 1.0) <= tol
