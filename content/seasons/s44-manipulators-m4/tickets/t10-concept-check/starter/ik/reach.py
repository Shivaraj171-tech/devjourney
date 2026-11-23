"""IK as "forward kinematics backwards": how many ways can the arm reach a point?

A two-link arm's gripper can be anywhere in a RING around the shoulder:

    inner = |l1 - l2|   <=   r = |target|   <=   outer = l1 + l2

  outside the ring (r > outer, or r < inner):  0 solutions (out of reach, or too close)
  on its edge (r = outer, or r = inner):       1 solution (stretched out, or folded back)
  strictly inside:                             2 solutions (elbow up and elbow down)
  r = 0 with l1 = l2:                          infinitely many (fold back, any q1)
"""
import math


def count_solutions(x, z, l1, l2, tol=1e-9):
    """How many joint configurations put the gripper at (x, z): 0, 1, 2 or math.inf."""
    r = math.hypot(x, z)
    outer, inner = l1 + l2, abs(l1 - l2)
    if r <= tol and inner <= tol:
        return math.inf
    if r > outer + tol or r < inner - tol:
        return 0
    if abs(r - outer) <= tol or abs(r - inner) <= tol:
        return 1
    return 2


def brute_force(fk_point, target, steps=72, tol=0.03):
    """FK backwards, the slow way: every (q1, q2) on a grid whose gripper lands within tol of target."""
    found = []
    for i in range(steps):
        for j in range(steps):
            q = [-math.pi + 2 * math.pi * i / steps, -math.pi + 2 * math.pi * j / steps]
            p = fk_point(q)
            if math.dist([p[0], p[2]], target) <= tol:
                found.append(q)
    return found
