"""Slerp vs naive Euler-angle interpolation: angle from start over time."""

import numpy as np


def main(lab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    from labs.manipulators.toolbox import euler_zyx_to_matrix, log_so3

    a0, a1 = np.array([0.0, 0.0, 0.0]), np.array([2.5, 1.2, -2.0])
    R0, R1 = euler_zyx_to_matrix(*a0), euler_zyx_to_matrix(*a1)
    q0, q1 = lab.matrix_to_quat(R0), lab.matrix_to_quat(R1)
    ts = np.linspace(0, 1, 101)
    slerp = [np.linalg.norm(log_so3(R0.T @ lab.quat_to_matrix(lab.quat_slerp(q0, q1, t))))
             for t in ts]
    euler = [np.linalg.norm(log_so3(R0.T @ euler_zyx_to_matrix(*((1 - t) * a0 + t * a1))))
             for t in ts]
    fig, ax = plt.subplots(figsize=(6, 3.5))
    ax.plot(ts, slerp, label="slerp (straight line on the sphere)")
    ax.plot(ts, euler, label="lerp of Euler angles")
    ax.set_xlabel("t")
    ax.set_ylabel("angle from start [rad]")
    ax.legend()
    ax.set_title("Slerp turns at constant speed; Euler lerp does not")
    fig.tight_layout()
    path = outdir / "lab04_slerp.png"
    fig.savefig(path, dpi=120)
    return path
