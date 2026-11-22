"""Plot the smallest singular value of the Euler-rate matrix E against pitch."""

import numpy as np


def main(lab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    pitches = np.linspace(-np.pi / 2 - 0.3, np.pi / 2 + 0.3, 400)
    smin = [np.linalg.svd(lab.euler_rate_matrix(0.3, p, 0.2), compute_uv=False).min()
            for p in pitches]
    fig, ax = plt.subplots(figsize=(6, 3.5))
    ax.plot(np.degrees(pitches), smin)
    for x in (-90, 90):
        ax.axvline(x, color="0.6", linestyle="--", linewidth=1)
    ax.set_xlabel("pitch [deg]")
    ax.set_ylabel("smallest singular value of E")
    ax.set_title("Gimbal lock: Euler rates lose a direction at pitch = ±90°")
    fig.tight_layout()
    path = outdir / "lab02_gimbal_lock.png"
    fig.savefig(path, dpi=120)
    return path
