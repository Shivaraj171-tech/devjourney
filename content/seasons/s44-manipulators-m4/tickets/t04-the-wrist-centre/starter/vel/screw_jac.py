"""Space and body Jacobians (twists, from Module 2's screw axes), linked by the adjoint.

A twist V = (w, v) is how a rigid body moves right now: w its angular velocity, v the
velocity of the body point that is passing through the frame's ORIGIN at this instant.
Written in the base ("space") frame it is V_s; in the gripper's own frame, V_b.

    V_s = J_s(q) qdot          column i = Ad(e^[S1]q1 ... e^[S(i-1)]q(i-1)) S_i
    V_b = J_b(q) qdot          J_b = Ad(T^-1) J_s,   T = T_sb(q) the gripper's pose

The adjoint of T = (R, p) moves a twist from T's frame into the frame T is written in:

    Ad(T) = [[ R,     0 ],
             [ [p] R, R ]]      (6 x 6, for twists ordered (w, v))

The geometric Jacobian is the same motion again: the gripper POINT's velocity is
v_s + w x p (the body point at the origin, carried over to where the gripper is).
"""
from rigid.axis_angle import skew
from rigid.mat import matmul
from rigid.transform import T_inv, T_mul, rotation_of, translation_of
from kin.poe import exp_twist, fk_poe
from vel.geometric import cross


def adjoint(T):
    """The 6 x 6 adjoint of a 4x4 transform, for twists (w, v)."""
    R, p = rotation_of(T), translation_of(T)
    pR = matmul(skew(p), R)
    top = [R[i] + [0.0, 0.0, 0.0] for i in range(3)]
    bottom = [pR[i] + R[i] for i in range(3)]
    return top + bottom


def apply6(A, V):
    return [sum(A[i][k] * V[k] for k in range(6)) for i in range(6)]


def columns_to_rows(columns):
    return [[col[r] for col in columns] for r in range(len(columns[0]))]


def space_jacobian(screws, q):
    """J_s(q), 6 x n: column i is screw i, moved by the joints before it."""
    T = [[float(i == j) for j in range(4)] for i in range(4)]
    columns = []
    for S, qi in zip(screws, q):
        columns.append(apply6(adjoint(T), S))
        T = T_mul(T, exp_twist(S, qi))
    return columns_to_rows(columns)


def body_jacobian(screws, M, q):
    """J_b(q) = Ad(T_sb^-1) J_s(q): the same columns, written in the gripper's frame."""
    Js = space_jacobian(screws, q)
    Ad = adjoint(T_inv(fk_poe(M, screws, q)))
    n = len(q)
    columns = [apply6(Ad, [Js[r][c] for r in range(6)]) for c in range(n)]
    return columns_to_rows(columns)


def geometric_from_space(Js, p):
    """[Jv; Jw] from J_s: Jw = the w rows; Jv = v_s + w x p for the gripper point p."""
    columns = []
    for c in range(len(Js[0])):
        w, v = [Js[r][c] for r in range(3)], [Js[r][c] for r in range(3, 6)]
        wxp = cross(w, p)
        columns.append([v[k] + wxp[k] for k in range(3)] + w)
    return columns_to_rows(columns)
