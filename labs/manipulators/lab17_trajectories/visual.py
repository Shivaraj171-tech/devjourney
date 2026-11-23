"""Joint-space vs Cartesian move on the UR5e: gripper paths (top view) and joint velocities."""

import numpy as np


def main(lab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    from labs.manipulators.toolbox import UR5E_DH, fk_dh

    qa = np.array([0.0, -1.2, 1.5, -1.9, -1.57, 0.0])
    qb = np.array([0.9, -1.7, 1.9, -1.6, -1.2, 0.8])
    Ta, Tb = fk_dh(UR5E_DH, qa), fk_dh(UR5E_DH, qb)
    dt, T = 0.01, 2.0
    ts = np.arange(0, T + 1e-9, dt)
    Qj = np.asarray(lab.joint_trajectory(qa, qb, T, ts)[0])
    Qc = np.asarray(lab.cartesian_trajectory(Ta, Tb, T, ts, qa)[0])
    fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(13, 4))
    for name, Q in (("joint space", Qj), ("Cartesian", Qc)):
        P = np.asarray(lab.ee_positions(Q))
        ax1.plot(P[:, 0], P[:, 1], label=name)
    ax1.plot([Ta[0, 3], Tb[0, 3]], [Ta[1, 3], Tb[1, 3]], "k--", linewidth=1, label="straight line")
    ax1.set_aspect("equal")
    ax1.set_xlabel("x [m]")
    ax1.set_ylabel("y [m]")
    ax1.legend(fontsize=8)
    ax1.set_title("gripper path (top view)")
    for ax, (name, Q) in zip((ax2, ax3), (("joint space", Qj), ("Cartesian", Qc))):
        Qd = np.asarray(lab.finite_differences(Q, dt)[0])
        ax.plot(ts, Qd)
        ax.set_title(f"{name}: joint velocities [rad/s]")
        ax.set_xlabel("t [s]")
    fig.tight_layout()
    path = outdir / "lab17_trajectories.png"
    fig.savefig(path, dpi=120)
    return path
