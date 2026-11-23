"""Joints: what a robot arm is made of.

A REVOLUTE joint turns about its axis by q radians (a hinge: shoulder, elbow, wrist).
A PRISMATIC joint slides along its axis by q metres (a drawer, a lift).
Either way the joint is a 4x4 transform from the frame just before it to the frame
just after it, and each joint adds ONE degree of freedom (DOF).
"""
from rigid.axis_angle import rodrigues, unit
from rigid.mat import identity
from rigid.transform import make_T


def trans(x, y, z):
    """A pure move: no turn."""
    return make_T(identity(3), (x, y, z))


def turn(R):
    """A pure turn: no move."""
    return make_T(R, (0.0, 0.0, 0.0))


def joint_transform(kind, axis, q):
    """The joint's own motion: turn by q about `axis` (revolute) or slide q along it (prismatic)."""
    if kind == "revolute":
        return turn(rodrigues(axis, q))
    if kind == "prismatic":
        u = unit(axis)
        return trans(u[0] * q, u[1] * q, u[2] * q)
    raise ValueError(f"unknown joint kind {kind!r}: use 'revolute' or 'prismatic'")


def mobility(links, joint_freedoms, spatial=True):
    """Grübler's count of a mechanism's degrees of freedom.

    links:          the number of links, COUNTING THE GROUND (the fixed base) as one.
    joint_freedoms: the freedoms of each joint (1 for revolute or prismatic).
    spatial:        True in 3D (a free body has 6 DOF), False in the plane (3 DOF).

        dof = m (N - 1 - J) + sum(f_i)
    """
    m = 6 if spatial else 3
    return m * (links - 1 - len(joint_freedoms)) + sum(joint_freedoms)
