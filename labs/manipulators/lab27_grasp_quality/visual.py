"""Epsilon metric vs friction for the candidate box grasps, and sigma_min of their grasp matrices."""

import numpy as np


def main(lab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    a = 0.02
    cands = lab.box_grasp_candidates(a)
    mus = np.linspace(0.1, 1.0, 10)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4), gridspec_kw={"width_ratios": [3, 2]})
    for name, (pts, nrm) in cands.items():
        eps = [lab.epsilon_metric(lab.primitive_wrenches(pts, nrm, mu, 8, a)) for mu in mus]
        ax1.plot(mus, eps, "o-", label=name, markersize=3)
    ax1.axhline(0, color="k", linewidth=1)
    ax1.set(xlabel="friction coefficient mu", ylabel="epsilon (> 0: force closure)",
            title="Epsilon metric of candidate grasps on a 4 cm cube")
    ax1.legend(fontsize=8)
    names = list(cands)
    sig = [lab.min_singular_value(lab.scaled_grasp_matrix(cands[n][0], a)) for n in names]
    ax2.barh(names, sig)
    ax2.set(xlabel="sigma_min of G (moments / a)", title="Ignores friction and 'push only'")
    fig.tight_layout()
    path = outdir / "lab27_grasp_quality.png"
    fig.savefig(path, dpi=120)
    return path
