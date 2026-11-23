"""Lab 27 reference solution: grasp quality. Force closure, the minimum singular value of the grasp
matrix and an epsilon-metric (Ferrari-Canny) approximation, comparing candidate grasps on a box."""

from __future__ import annotations

import numpy as np

from labs.manipulators.lab26_grasp_basics.solution import contact_wrench, friction_cone_edges, grasp_matrix


def scaled_grasp_matrix(points, length: float) -> np.ndarray:
    """Lab 26's G with the moment rows divided by a characteristic length, so all six rows are in
    newtons and a 'unit wrench' means the same thing in every direction."""
    G = np.asarray(grasp_matrix(points), dtype=float).copy()
    G[:3] /= length
    return G


def min_singular_value(G) -> float:
    """Smallest singular value of G (6 x 3k): the weakest wrench direction the contact forces can
    produce per unit of force. 0 means some wrench can't be produced at all (rank < 6)."""
    return float(np.linalg.svd(np.asarray(G, dtype=float), compute_uv=False)[-1])


def primitive_wrenches(points, normals, mu: float, k: int = 8, length: float = 1.0,
                       torsion: float = 0.0) -> np.ndarray:
    """(m, 6) wrenches (moment / length, force) of every friction-cone edge of every contact (unit
    normal force). torsion > 0 models a soft finger: each contact can also twist the object about
    its normal by up to torsion (N m per N of normal force), adding the pure moments +-torsion n."""
    out = []
    for p, n in zip(np.atleast_2d(points), np.atleast_2d(normals)):
        nn = np.asarray(n, dtype=float) / np.linalg.norm(n)
        for f in friction_cone_edges(nn, mu, k):
            w = contact_wrench(p, f)
            if torsion > 0:
                for sgn in (1.0, -1.0):
                    out.append(np.concatenate([(w[:3] + sgn * torsion * nn) / length, w[3:]]))
            else:
                out.append(np.concatenate([w[:3] / length, w[3:]]))
    return np.array(out)


def support(W, u) -> float:
    """h(u) = max_i u . w_i: how far the convex hull of the wrenches reaches in direction u."""
    return float(np.max(np.asarray(W) @ np.asarray(u)))


def epsilon_sampled(W, n_dirs: int = 2000, seed: int = 0) -> float:
    """min over sampled unit directions of h(u): the +-axes plus n_dirs Gaussian directions (fixed
    seed). An UPPER bound on the true epsilon (the minimum might fall between the samples)."""
    U = sample_directions(W.shape[1], n_dirs, seed)
    return float(np.min(np.max(U @ np.asarray(W).T, axis=1)))


def sample_directions(d: int, n_dirs: int, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    U = np.vstack([np.eye(d), -np.eye(d), rng.normal(size=(n_dirs, d))])
    return U / np.linalg.norm(U, axis=1, keepdims=True)


def refine_direction(W, u, betas=None) -> np.ndarray:
    """Polish a direction to lower h(u). h is a max of linear functions (kinked), so descend on the
    smooth 'soft max' h_b(u) = (1/b) log sum exp(b u.w_i), whose gradient is the softmax-weighted
    average of the w_i. Project the gradient onto the sphere's tangent, step 1 / b, renormalise,
    and raise b gradually (20 -> 1e6, 1000 steps) so h_b tends to h."""
    W = np.asarray(W, dtype=float)
    u = np.asarray(u, dtype=float) / np.linalg.norm(u)
    for b in (np.geomspace(20.0, 1e6, 1000) if betas is None else betas):
        s = W @ u
        p = np.exp(b * (s - s.max()))
        grad = (p / p.sum()) @ W
        grad -= (grad @ u) * u
        u = u - grad / b
        u /= np.linalg.norm(u)
    return u


def epsilon_metric(W, n_dirs: int = 2000, seed: int = 0, n_refine: int = 10) -> float:
    """Ferrari-Canny epsilon = radius of the largest origin-centred ball inside conv(W)
    = min over unit u of h(u). Sample, then refine the n_refine best directions; return the
    smallest h seen. > 0: force closure (and how robustly); <= 0: some wrench can't be resisted
    (for an origin outside the hull, -epsilon is its distance to the hull)."""
    W = np.asarray(W, dtype=float)
    U = sample_directions(W.shape[1], n_dirs, seed)
    h = np.max(U @ W.T, axis=1)
    best = float(h.min())
    for i in np.argsort(h)[:n_refine]:
        best = min(best, support(W, refine_direction(W, U[i])))
    return best


def is_force_closure(W, tol: float = 1e-4) -> bool:
    """The hull of the primitive wrenches strictly contains the origin: epsilon > tol."""
    return epsilon_metric(W) > tol


def antipodal_min_friction(p1, n1, p2, n2) -> float:
    """Two contacts can squeeze along the line joining them only if that line lies inside both
    friction cones: mu >= tan(angle between the line and each inward normal). Returns the larger."""
    p1, p2 = np.asarray(p1, dtype=float), np.asarray(p2, dtype=float)
    d = (p2 - p1) / np.linalg.norm(p2 - p1)
    out = 0.0
    for n, line in ((n1, d), (n2, -d)):
        n = np.asarray(n, dtype=float) / np.linalg.norm(n)
        c = float(np.clip(line @ n, -1.0, 1.0))
        out = max(out, np.inf if c <= 0 else np.sqrt(1 - c**2) / c)
    return float(out)


def box_grasp_candidates(a: float) -> dict:
    """Named candidate grasps on a cube of half size a centred at the origin:
    name -> (points (k, 3), inward normals (k, 3))."""
    X, Y, Z = np.eye(3)
    return {
        "pinch": (np.array([-a * X, a * X]), np.array([X, -X])),
        "pinch_offset": (np.array([-a * X + 0.5 * a * Z, a * X - 0.5 * a * Z]), np.array([X, -X])),
        "four_finger": (np.array([-a * X + 0.5 * a * Z, -a * X - 0.5 * a * Z,
                                  a * X + 0.5 * a * Z, a * X - 0.5 * a * Z]),
                        np.array([X, X, -X, -X])),
        "tripod": (np.array([-a * X, a * X + 0.6 * a * Y, a * X - 0.6 * a * Y]), np.array([X, -X, -X])),
        "adjacent_faces": (np.array([-a * X, -a * Y]), np.array([X, Y])),
        "top_only": (np.array([a * X * 0.5 + a * Z, -a * X * 0.5 + a * Z, a * Y * 0.5 + a * Z]),
                     np.array([-Z, -Z, -Z])),
    }


def rank_grasps(candidates: dict, mu: float, length: float, k: int = 8, torsion: float = 0.0) -> list:
    """[(name, epsilon, sigma_min)] sorted by epsilon, best first."""
    rows = []
    for name, (pts, nrm) in candidates.items():
        W = primitive_wrenches(pts, nrm, mu, k, length, torsion)
        rows.append((name, epsilon_metric(W), min_singular_value(scaled_grasp_matrix(pts, length))))
    return sorted(rows, key=lambda r: -r[1])
