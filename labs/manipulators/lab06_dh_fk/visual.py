"""3D stick figures of the UR5 and the 3-DOF arm, drawn from your fk_dh_frames."""

import numpy as np


def main(lab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    from labs.manipulators.toolbox import UR5_DH

    arms = [("UR5", UR5_DH, np.array([0.3, -1.2, 1.6, -1.9, -1.57, 0.0]))]
    if lab.ARM3_DH is not None:
        arms.append(("3-DOF arm", lab.ARM3_DH, np.array([0.5, 0.6, -1.0])))
    fig = plt.figure(figsize=(5 * len(arms), 4.5))
    for k, (name, dh, q) in enumerate(arms, 1):
        ax = fig.add_subplot(1, len(arms), k, projection="3d")
        frames = lab.fk_dh_frames(dh, q)
        pts = np.array([T[:3, 3] for T in frames])
        ax.plot(*pts.T, "-o", linewidth=3)
        T = frames[-1]
        for i, c in enumerate("rgb"):  # tool frame axes
            ax.quiver(*T[:3, 3], *(0.1 * T[:3, i]), color=c)
        ax.set_title(f"{name}, q = {np.round(q, 2)}", fontsize=8)
        span = max(np.ptp(pts, axis=0).max(), 0.3)
        mid = pts.mean(axis=0)
        for setter, m in zip((ax.set_xlim, ax.set_ylim, ax.set_zlim), mid):
            setter(m - span / 2 - 0.1, m + span / 2 + 0.1)
    fig.tight_layout()
    path = outdir / "lab06_arms.png"
    fig.savefig(path, dpi=120)
    return path
