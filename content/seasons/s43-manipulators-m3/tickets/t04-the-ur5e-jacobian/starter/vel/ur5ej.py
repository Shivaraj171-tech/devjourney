"""The UR5e's 6 x 6 geometric Jacobian, and an independent check by finite differences.

ur5e_jacobian(q) = geometric_jacobian(ur5e_frames(q)): rows vx, vy, vz, wx, wy, wz of the
tool flange, in the base frame.

The check knows nothing about axes or cross products: nudge joint i by +-h and watch the
flange.
  Linear part:  (p(q + h e_i) - p(q - h e_i)) / (2h).
  Angular part: R changes as dR/dt = [w] R, with w the angular velocity in the BASE
                frame, so [w] = dR/dt R^T and w = vee(dR/dt R^T).
"""
from rigid.mat import matmul, transpose
from rigid.transform import rotation_of, translation_of
from kin.ur5e import ur5e_frames
from vel.geometric import geometric_jacobian
from vel.numeric import step


def ur5e_jacobian(q):
    """The UR5e's geometric Jacobian [Jv; Jw] (6 rows of 6) at q."""
    return geometric_jacobian(ur5e_frames(q))


def vee(W):
    """[w] -> w: the vector of a (nearly) skew-symmetric 3x3, averaging the two halves."""
    return [(W[2][1] - W[1][2]) / 2, (W[0][2] - W[2][0]) / 2, (W[1][0] - W[0][1]) / 2]


def numeric_geometric_jacobian(fk, q, h=1e-6):
    """[Jv; Jw] by central differences of fk(q) (a 4x4), one joint at a time."""
    R = rotation_of(fk(q))
    columns = []
    for i in range(len(q)):
        e_i = [1.0 if j == i else 0.0 for j in range(len(q))]
        T_plus, T_minus = fk(step(q, e_i, h)), fk(step(q, e_i, -h))
        v = [(a - b) / (2 * h) for a, b in zip(translation_of(T_plus), translation_of(T_minus))]
        Rdot = [[(a - b) / (2 * h) for a, b in zip(ra, rb)] for ra, rb in zip(rotation_of(T_plus), rotation_of(T_minus))]
        w = vee(matmul(transpose(R), Rdot))
        columns.append(v + w)
    return [[col[row] for col in columns] for row in range(6)]


def flange_velocity(q, qdot):
    """(v, w): the flange's linear and angular velocity for joint speeds qdot: J qdot."""
    J = ur5e_jacobian(q)
    twist = [sum(J[r][c] * qdot[c] for c in range(6)) for r in range(6)]
    return twist[:3], twist[3:]
