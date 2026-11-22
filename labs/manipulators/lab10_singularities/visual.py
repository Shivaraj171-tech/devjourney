"""Planar 2R arm in several poses, each with its velocity manipulability ellipse."""

import numpy as np

L1, L2 = 1.0, 0.8


def main(lab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(6, 5))
    t = np.linspace(0, 2 * np.pi, 100)
    for t1, t2 in [(0.2, 0.15), (0.6, 0.8), (1.2, 1.57), (2.0, 2.6)]:
        elbow = L1 * np.array([np.cos(t1), np.sin(t1)])
        hand = elbow + L2 * np.array([np.cos(t1 + t2), np.sin(t1 + t2)])
        J = np.array([[-L1 * np.sin(t1) - L2 * np.sin(t1 + t2), -L2 * np.sin(t1 + t2)],
                      [L1 * np.cos(t1) + L2 * np.cos(t1 + t2), L2 * np.cos(t1 + t2)]])
        lengths, axes = lab.velocity_ellipsoid(J)
        ell = hand[:, None] + 0.3 * axes @ (np.asarray(lengths)[:, None] * np.vstack([np.cos(t), np.sin(t)]))
        line, = ax.plot([0, elbow[0], hand[0]], [0, elbow[1], hand[1]], "-o", linewidth=2)
        ax.plot(*ell, color=line.get_color(), linewidth=1)
        ax.annotate(f"w={lab.manipulability(J):.2f}", hand, textcoords="offset points",
                    xytext=(6, 6), fontsize=8)
    ax.set_aspect("equal")
    ax.set_title("Velocity ellipses (scaled 0.3x): flat near the singular stretched pose")
    fig.tight_layout()
    path = outdir / "lab10_ellipses.png"
    fig.savefig(path, dpi=120)
    return path
