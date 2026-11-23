"""How far the pinched box falls in 1 s as the pad friction crosses mu_min = m g / (2 N).
Needs MuJoCo."""

import numpy as np


def main(lab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    mass, squeeze = 0.2, 5.0
    mu_min = lab.min_friction_two_finger(mass, squeeze)
    ratios = np.linspace(0.5, 1.5, 21)
    drops = [lab.pinch_experiment(r * mu_min, squeeze, mass)[0] for r in ratios]
    fig, ax = plt.subplots(figsize=(7, 4))
    ax.semilogy(ratios, np.maximum(drops, 1e-6), "o-")
    ax.axvline(1.0, color="k", linestyle=":", label="mu = m g / (2 N)")
    ax.set(xlabel="mu / mu_min", ylabel="drop in 1 s [m]",
           title=f"Two-finger pinch, m = {mass} kg, N = {squeeze} N per finger")
    ax.legend()
    fig.tight_layout()
    path = outdir / "lab26_pinch_threshold.png"
    fig.savefig(path, dpi=120)
    return path
