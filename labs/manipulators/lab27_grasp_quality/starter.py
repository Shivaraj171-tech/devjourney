"""Lab 27: grasp quality: force closure, sigma_min of the grasp matrix, the epsilon metric.

Toolbox (lab 26): contact_wrench, friction_cone_edges, grasp_matrix. Wrenches are (m, f).
"""

from __future__ import annotations

import numpy as np

from labs.manipulators.toolbox import contact_wrench, friction_cone_edges, grasp_matrix  # noqa: F401


def scaled_grasp_matrix(points, length: float) -> np.ndarray:
    """grasp_matrix(points) with its three moment rows divided by `length` (README step 1)."""
    # TODO: README step 1
    raise NotImplementedError("scaled grasp matrix")


def min_singular_value(G) -> float:
    """Smallest singular value of G (README step 2)."""
    # TODO: README step 2
    raise NotImplementedError("sigma_min")


def primitive_wrenches(points, normals, mu: float, k: int = 8, length: float = 1.0,
                       torsion: float = 0.0) -> np.ndarray:
    """(m, 6) rows (moment / length, force) for each cone edge (unit normal force) of each contact.
    torsion > 0: each edge twice, with moments +- torsion * n added before scaling (README step 3)."""
    # TODO: README step 3
    raise NotImplementedError("primitive wrenches")


def support(W, u) -> float:
    """h(u) = max_i u . w_i (README step 4)."""
    # TODO: README step 4
    raise NotImplementedError("support function")


def sample_directions(d: int, n_dirs: int, seed: int) -> np.ndarray:
    """Unit rows: +-e_1..e_d, then n_dirs Gaussian samples from default_rng(seed), normalised."""
    rng = np.random.default_rng(seed)
    U = np.vstack([np.eye(d), -np.eye(d), rng.normal(size=(n_dirs, d))])
    return U / np.linalg.norm(U, axis=1, keepdims=True)


def epsilon_sampled(W, n_dirs: int = 2000, seed: int = 0) -> float:
    """min of h(u) over sample_directions(6, n_dirs, seed) (README step 5)."""
    # TODO: README step 5
    raise NotImplementedError("sampled epsilon")


def refine_direction(W, u, betas=None) -> np.ndarray:
    """Soft-max descent on the sphere (README step 5): for b in geomspace(20, 1e6, 1000):
    p = softmax(b W u); g = p @ W minus its component along u; u = normalise(u - g / b)."""
    # TODO: README step 5
    raise NotImplementedError("refine a direction")


def epsilon_metric(W, n_dirs: int = 2000, seed: int = 0, n_refine: int = 10) -> float:
    """Sample, refine the n_refine directions with the smallest h, return the smallest h seen."""
    # TODO: README step 5
    raise NotImplementedError("epsilon metric")


def is_force_closure(W, tol: float = 1e-4) -> bool:
    """epsilon_metric(W) > tol (README step 4)."""
    # TODO: README step 4
    raise NotImplementedError("force closure test")


def antipodal_min_friction(p1, n1, p2, n2) -> float:
    """Smallest mu for which the line p1-p2 lies inside both cones: max of tan(angle) between the
    line (pointing from each contact to the other) and that contact's inward normal (README step 6)."""
    # TODO: README step 6
    raise NotImplementedError("antipodal friction")


def box_grasp_candidates(a: float) -> dict:
    """name -> (points, inward normals) on a cube of half size a. Given: don't change."""
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
    """[(name, epsilon, sigma_min of the scaled G)] sorted by epsilon, best first (README step 7)."""
    # TODO: README step 7
    raise NotImplementedError("rank grasps")
