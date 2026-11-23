import math

from lab import viz

from ik.reach import brute_force, count_solutions
from ik.upright import upright_elbow, upright_links, upright_tip
from vel.two_link import L1, L2

TARGET = (0.6, 0.2)  # the box, in the arm's vertical plane: 0.6 m out, 0.2 m up


def ring(radius, n=24):
    pts = [(radius * math.cos(2 * math.pi * k / n), 0.0, radius * math.sin(2 * math.pi * k / n)) for k in range(n + 1)]
    return list(zip(pts, pts[1:]))


def best(found, sign):
    """The grid pose closest to the target among those with the elbow bent one way."""
    side = [q for q in found if q[1] * sign > 0]
    return min(side, key=lambda q: math.dist([upright_tip(q)[0], upright_tip(q)[2]], TARGET))


def test_draw_fk_backwards():
    found = brute_force(upright_tip, TARGET)
    up, down = best(found, -1), best(found, +1)
    poses = []
    for a, b in (([0.0, 0.0], up), (up, down)):
        poses += [[x + (y - x) * k / 20 for x, y in zip(a, b)] for k in range(21)]
    elbows = [tuple(upright_elbow(q)) + ("",) for q in found]
    viz.arm3d([upright_links(q) for q in poses], axes=True, name="backwards", target=(TARGET[0], 0.0, TARGET[1]),
              labels=["base", "upright", "elbow", "gripper"], lines=ring(L1 + L2), points=elbows[:200],
              title="Forward kinematics, backwards", trail=False,
              caption=f"{len(found)} grid poses land within 3 cm of the box. Their elbows (dots): TWO clusters. Circle: full reach.")
    assert found, "the brute-force search should find grid poses near the box"


def test_two_solutions_inside_the_ring():
    got = count_solutions(*TARGET, L1, L2)
    assert got == 2, f"(0.6, 0.2) is strictly inside the ring {abs(L1 - L2):.1f} < r < {L1 + L2:.1f}: elbow up and elbow down, 2 solutions; got {got}"


def test_out_of_reach_is_zero():
    for x, z, why in ((0.95, 0.0, "further than l1 + l2 = 0.9"), (0.05, 0.0, "closer than |l1 - l2| = 0.1: the forearm can't fold back that far")):
        got = count_solutions(x, z, L1, L2)
        assert got == 0, f"({x}, {z}) is {why}: no solution, got {got}"


def test_the_edges_have_one_solution():
    a = 0.5
    got = count_solutions(0.9 * math.cos(a), 0.9 * math.sin(a), L1, L2)
    assert got == 1, f"exactly at full reach the arm must be stretched out: ONE solution (both elbows coincide), got {got}"
    got = count_solutions(0.1, 0.0, L1, L2)
    assert got == 1, f"at r = |l1 - l2| = 0.1 the arm must be folded right back: ONE solution, got {got}"


def test_equal_links_at_the_origin():
    assert count_solutions(0.0, 0.0, 0.4, 0.4) == math.inf, "with l1 = l2, folding back reaches the shoulder for ANY q1: infinitely many"


def test_brute_force_sees_both_elbows():
    found = brute_force(upright_tip, TARGET)
    assert any(q[1] < 0 for q in found) and any(q[1] > 0 for q in found), "grid poses with q2 < 0 (elbow up) and q2 > 0 (elbow down)"
