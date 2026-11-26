"""Velocity kinematics by numbers: differentiate forward kinematics.

If the joints move at speeds qdot (rad/s), the gripper's position p(q) moves at

    v = dp/dt  ~  (p(q + h qdot) - p(q - h qdot)) / (2 h)       (a central difference)

and, one joint at a time, the numeric Jacobian (column i: the gripper's velocity when
only joint i turns, at 1 rad/s):

    J[:, i]  ~  (p(q + h e_i) - p(q - h e_i)) / (2 h)

fk_point is any function q -> [x, y, z]. q is never changed.
"""


def step(q, direction, h):
    """q + h * direction."""
    for i in range(len(q)):
        q[i] += h * direction[i]
    return q


def tip_velocity(fk_point, q, qdot, h=1e-6):
    """The gripper's velocity [vx, vy, vz] when the joints move at qdot, by a central difference."""
    ahead = fk_point(step(q, qdot, h))
    behind = fk_point(step(q, qdot, -h))
    return [(a - b) / (2 * h) for a, b in zip(ahead, behind)]


def numeric_jacobian(fk_point, q, h=1e-6):
    """The Jacobian as a list of rows (3 x n): column i is the tip velocity for joint i alone."""
    columns = []
    for i in range(len(q)):
        e_i = [1.0 if j == i else 0.0 for j in range(len(q))]
        columns.append(tip_velocity(fk_point, q, e_i, h))
    return [[col[r] for col in columns] for r in range(len(columns[0]))]
