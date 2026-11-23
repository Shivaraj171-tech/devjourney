"""2D rotations: turning a box on Grabby's packing table, seen from above.

Angles are in RADIANS, anticlockwise positive (like on a maths graph).
A 2x2 rotation matrix is a list of two rows: R[row][col].
"""
import math


def rot2(theta):
    """The 2x2 matrix that turns a vector anticlockwise by theta radians.

    Its COLUMNS are where the x axis and the y axis end up after the turn.
    """
    c, s = math.cos(theta), math.sin(theta)
    return [[c, -s],
            [s, c]]


def apply2(R, v):
    """R times the vector v = (x, y): row 0 of R gives the new x, row 1 the new y."""
    return [R[0][0] * v[0] + R[0][1] * v[1],
            R[1][0] * v[0] + R[1][1] * v[1]]


def columns(R):
    """The two columns of a 2x2 matrix, as vectors: (first column, second column)."""
    return [R[0][0], R[1][0]], [R[0][1], R[1][1]]
