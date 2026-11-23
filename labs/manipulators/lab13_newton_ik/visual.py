"""Newton-Raphson IK on the UR5: error vs iteration for several initial guesses."""

import numpy as np


def main(lab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    from labs.manipulators.toolbox import UR5_DH, body_screws, fk_body, screws_from_dh

    M, S = screws_from_dh(UR5_DH)
    B = body_screws(M, S)
    q_true = np.array([0.3, -1.1, 1.4, -1.8, -1.4, 0.5])
    T_goal = fk_body(M, B, q_true)
    unreachable = T_goal.copy()
    unreachable[:3, 3] = [1.2, 0.3, 0.4]
    runs = [("seed = solution + 0.2", T_goal, q_true + 0.2),
            ("seed near singular q = 0", T_goal, np.array([0, -0.2, 0.2, 0, 0.2, 0])),
            ("seed = solution + 1.5", T_goal, q_true + 1.5),
            ("unreachable target", unreachable, q_true)]
    fig, ax = plt.subplots(figsize=(6.5, 4))
    for label, T, q0 in runs:
        _, ok, hist = lab.ik_newton(M, B, T, q0)
        e = np.maximum(np.asarray(hist).sum(axis=1), 1e-16)
        ax.semilogy(e, "-o", markersize=3, label=f"{label} ({'ok' if ok else 'FAILED'})")
    ax.set_xlabel("iteration")
    ax.set_ylabel("|omega_b| + |v_b|")
    ax.set_title("Newton-Raphson IK: quadratic near a solution, erratic far away")
    ax.legend(fontsize=8)
    fig.tight_layout()
    path = outdir / "lab13_newton_convergence.png"
    fig.savefig(path, dpi=120)
    return path
