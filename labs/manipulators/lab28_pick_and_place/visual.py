"""The pick-and-place run seen from above and from the side: box and gripper (TCP) paths.
Needs MuJoCo."""

import numpy as np


def main(lab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    target = np.array([-0.40, 0.20])
    res = lab.run_pick_and_place([-0.45, -0.15], 0.3, target, -0.2)
    t, box, tcp, ends = res["t"], res["box"], res["tcp"], res["segments_end"]
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5))
    ax1.plot(tcp[:, 0], tcp[:, 1], label="gripper (TCP)")
    ax1.plot(box[:, 0], box[:, 1], "--", label="box")
    ax1.plot(*target, "kx", markersize=10, label="target")
    ax1.set(xlabel="x [m]", ylabel="y [m]", aspect="equal", title="Top view")
    ax1.legend(fontsize=7, loc="lower left", bbox_to_anchor=(1.02, 0.0))
    ax2.plot(t, tcp[:, 2], label="gripper (TCP) z")
    ax2.plot(t, box[:, 2], "--", label="box centre z")
    for e, name in zip(ends, ["pre", "grasp", "close", "lift", "carry", "place", "open", "retreat"]):
        ax2.axvline(e, color="0.85", zorder=0)
        ax2.text(e, 0.215, name, rotation=90, fontsize=7, ha="right", va="top")
    dxy, dyaw, _ = lab.placement_error(res, target, -0.2)
    ax2.set(xlabel="t [s]", ylabel="height [m]",
            title=f"Side view: placed {dxy * 1e3:.1f} mm, {np.degrees(dyaw):.2f} deg from target")
    ax2.legend(fontsize=8, loc="center right")
    fig.tight_layout()
    path = outdir / "lab28_pick_and_place.png"
    fig.savefig(path, dpi=120)
    return path
