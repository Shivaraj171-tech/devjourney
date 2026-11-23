"""The four IK solutions of the 3-DOF arm for one target, drawn in 3D."""

import numpy as np


def main(lab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    from labs.manipulators.toolbox import ARM3_DH, fk_dh_frames

    target = np.array([0.35, 0.2, 0.5])
    fig = plt.figure(figsize=(6, 5))
    ax = fig.add_subplot(projection="3d")
    for (shoulder, elbow), q in sorted(lab.arm3_ik_all(target).items()):
        pts = np.array([T[:3, 3] for T in fk_dh_frames(ARM3_DH, q)])
        ax.plot(*pts.T, "-o", linewidth=2, label=f"{shoulder}/{elbow}  q={np.round(q, 2)}")
    ax.scatter(*target, color="k", s=60, marker="x", label="target")
    ax.set_xlabel("x")
    ax.set_ylabel("y")
    ax.set_zlabel("z")
    ax.legend(fontsize=7, loc="upper left")
    ax.set_title("3-DOF arm: one target, four joint solutions")
    fig.tight_layout()
    path = outdir / "lab12_ik_solutions.png"
    fig.savefig(path, dpi=120)
    return path
