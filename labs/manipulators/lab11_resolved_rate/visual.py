"""Straight-line run in each available simulator: deviation from the line over time."""

import numpy as np


def main(lab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    from labs.manipulators.toolbox import UR5E_DH
    from labs.manipulators.toolbox.sim import KinematicSim, MujocoSim, mujoco_available

    q0 = np.array([0.0, -1.2, 1.5, -1.9, -1.57, 0.0])
    sims = [KinematicSim(UR5E_DH, q0)] + ([MujocoSim(UR5E_DH, q0)] if mujoco_available() else [])
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))
    for sim in sims:
        p0 = sim.ee_pose()[:3, 3]
        log = lab.run_straight_line(sim, p0 + np.array([0.15, 0.2, -0.1]))
        dev = lab.path_deviation(log["p"], log["p0"], log["p1"])
        ax1.plot(log["t"], dev * 1e3, label=sim.name)
        ax2.plot(log["p"][:, 0], log["p"][:, 1], label=sim.name)
    ax2.plot(*np.array([log["p0"], log["p1"]])[:, :2].T, "k--", linewidth=1, label="target line")
    ax1.set_xlabel("t [s]")
    ax1.set_ylabel("distance from line [mm]")
    ax2.set_xlabel("x [m]")
    ax2.set_ylabel("y [m]")
    ax2.set_aspect("equal")
    for ax in (ax1, ax2):
        ax.legend()
    fig.suptitle("Resolved-rate control of the UR5e along a straight line")
    fig.tight_layout()
    path = outdir / "lab11_straight_line.png"
    fig.savefig(path, dpi=120)
    return path
