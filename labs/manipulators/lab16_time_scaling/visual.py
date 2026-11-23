"""Cubic, quintic and trapezoidal profiles for the same move and the same limits."""

import numpy as np


def main(lab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    D, vmax, amax = 1.0, 1.0, 2.0
    profiles = {}
    for kind, fn in (("cubic", lab.cubic_scaling), ("quintic", lab.quintic_scaling)):
        T = lab.min_time_polynomial(D, vmax, amax, kind)
        profiles[f"{kind} (T={T:.2f}s)"] = (T, lambda t, T=T, fn=fn: np.array(fn(t, T)) * D)
    T = lab.trapezoid_profile(D, vmax, amax)[0]
    profiles[f"trapezoid (T={T:.2f}s)"] = (T, lambda t: np.array(lab.trapezoid_sample(t, D, vmax, amax)))
    T_end = max(T for T, _ in profiles.values())
    ts = np.linspace(0, T_end, 800)
    fig, axes = plt.subplots(3, 1, figsize=(6, 7), sharex=True)
    for label, (_, f) in profiles.items():
        X = np.array([f(t) for t in ts])
        for i, ax in enumerate(axes):
            ax.plot(ts, X[:, i], label=label)
    for ax, name, lim in zip(axes, ("position", "velocity", "acceleration"), (None, vmax, amax)):
        ax.set_ylabel(name)
        if lim:
            ax.axhline(lim, color="k", linestyle=":", linewidth=1)
            ax.axhline(-lim, color="k", linestyle=":", linewidth=1)
    axes[0].legend(fontsize=8)
    axes[-1].set_xlabel("t [s]")
    fig.suptitle(f"Fastest rest-to-rest move of D={D} with vmax={vmax}, amax={amax}")
    fig.tight_layout()
    path = outdir / "lab16_time_scaling.png"
    fig.savefig(path, dpi=120)
    return path
