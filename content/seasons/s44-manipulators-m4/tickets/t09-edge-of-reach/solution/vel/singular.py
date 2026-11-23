"""Where the UR5e loses a direction: its singularities.

The UR5e's 6 x 6 geometric Jacobian has a closed-form determinant (labs/manipulators lab 10):

    det J = a2 a3 sin(q3) sin(q5) (a2 cos q2 + a3 cos(q2 + q3) + d5 sin(q2 + q3 + q4))

Three factors, three kinds of singularity:
  "elbow":    sin(q3) = 0   the arm is stretched out (or folded back)
  "wrist":    sin(q5) = 0   the axes of joints 4 and 6 line up (a "wrist flip")
  "shoulder": the last factor = 0: the wrist sits right above the base's axis
"""
import math

from kin.ur5e import UR5E_DH

A2, A3, D5 = UR5E_DH[1][0], UR5E_DH[2][0], UR5E_DH[4][2]


def ur5e_det(q):
    """The closed-form determinant above."""
    _, q2, q3, q4, q5, _ = q
    return A2 * A3 * math.sin(q3) * math.sin(q5) * (A2 * math.cos(q2) + A3 * math.cos(q2 + q3) + D5 * math.sin(q2 + q3 + q4))


def singularity_kinds(q, tol=1e-3):
    """Which factors (nearly) vanish: a set, a subset of {"elbow", "wrist", "shoulder"}."""
    _, q2, q3, q4, q5, _ = q
    kinds = set()
    if abs(math.sin(q3)) < tol:
        kinds.add("elbow")
    if abs(math.sin(q5)) < tol:
        kinds.add("wrist")
    if abs(A2 * math.cos(q2) + A3 * math.cos(q2 + q3) + D5 * math.sin(q2 + q3 + q4)) < tol:
        kinds.add("shoulder")
    return kinds
