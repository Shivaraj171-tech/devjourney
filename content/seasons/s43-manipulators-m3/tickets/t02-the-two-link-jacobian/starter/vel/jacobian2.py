"""The two-link arm's Jacobian, derived by hand.

    x = l1 cos(q1) + l2 cos(q1 + q2)        y = l1 sin(q1) + l2 sin(q1 + q2)

The forearm's direction is the SUM q1 + q2 (q2 is measured from the upper arm), so
differentiating gives

    J = [[-l1 sin(q1) - l2 sin(q1 + q2),   -l2 sin(q1 + q2)],
         [ l1 cos(q1) + l2 cos(q1 + q2),    l2 cos(q1 + q2)]]

and det J = l1 l2 sin(q2): zero when the arm is stretched out or folded back.
"""
import math

from vel.two_link import L1, L2


def jacobian_2link(q, l1=L1, l2=L2):
    """2 x 2 Jacobian (rows: vx, vy) of the gripper's position at q = [q1, q2]."""
    q1, q2 = q
    s1, c1 = math.sin(q1), math.cos(q1)
    s12, c12 = math.sin(q2), math.cos(q2)
    return [[-l1 * s1 - l2 * s12, -l2 * s12],
            [l1 * c1 + l2 * c12, l2 * c12]]


def det_2link(q, l1=L1, l2=L2):
    """det J = l1 l2 sin(q2)."""
    J = jacobian_2link(q, l1, l2)
    return J[0][0] * J[1][1] - J[0][1] * J[1][0]


def tip_velocity_2link(q, qdot, l1=L1, l2=L2):
    """v = J qdot, the gripper's [vx, vy]."""
    J = jacobian_2link(q, l1, l2)
    return [J[0][0] * qdot[0] + J[0][1] * qdot[1], J[1][0] * qdot[0] + J[1][1] * qdot[1]]
