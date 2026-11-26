"""The geometric Jacobian of an arm of revolute joints, straight from its frames.

With standard DH, joint i turns about z_(i-1), the z axis of frame i-1, through that
frame's origin p_(i-1). Turning it at 1 rad/s swings the gripper (at p_e) around that
axis, so column i of the 6 x n geometric Jacobian [Jv; Jw] is

    Jv_i = z_(i-1) x (p_e - p_(i-1))      (linear velocity of the gripper point)
    Jw_i = z_(i-1)                         (angular velocity of the gripper)

frames: [T_0_0 = I, T_0_1, ..., T_0_n], every DH frame in the base (kin.dh.fk_dh_frames).
Rows 0-2: vx, vy, vz. Rows 3-5: wx, wy, wz. All in the BASE frame's axes.
"""


def cross(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]


def z_axis(T):
    """The frame's z axis: the THIRD COLUMN of its rotation."""
    return [T[0][2], T[1][2], T[2][2]]


def origin(T):
    return [T[0][3], T[1][3], T[2][3]]


def geometric_jacobian(frames):
    """6 x n [Jv; Jw] as a list of 6 rows, for an arm of n revolute joints."""
    p_e = origin(frames[-1])
    columns = []
    for i in range(len(frames) - 1):
        z = z_axis(frames[i + 1])
        r = [e - o for e, o in zip(p_e, origin(frames[i]))]
        columns.append(cross(z, r) + z)
    return [[col[row] for col in columns] for row in range(6)]
