"""Step responses of one PD-controlled joint for several damping ratios, and the 2R arm's
gravity droop as the stiffness grows."""

import numpy as np


def main(lab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    from labs.manipulators.toolbox import (
        forward_dynamics, planar2r_coriolis_matrix, planar2r_gravity, planar2r_mass_matrix, simulate,
    )
    from labs.manipulators.toolbox.robots import PLANAR2R_DYN as P

    J, wn, dt = P["I1"] + P["m1"] * P["lc1"] ** 2, 10.0, 0.001
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4))
    for zeta in (0.2, 0.5, 0.7, 1.0, 2.0):
        kp, kd = lab.pd_gains(J, wn, zeta)
        Q, _ = simulate(lambda q, qd, tau: tau / J, [0.0], [0.0], dt, 2000, "rk4",
                        lambda t, q, qd: lab.pd_torque(q, qd, [1.0], kp, kd))
        t = np.arange(len(Q)) * dt
        m = lab.step_metrics(t, np.asarray(Q)[:, 0], 0.0, 1.0)
        ax1.plot(t, np.asarray(Q)[:, 0], label=f"zeta={zeta}: OS {100 * m['overshoot']:.0f}%, "
                                               f"ts {m['settling_time']:.2f}s")
    ax1.axhspan(0.98, 1.02, color="0.9")
    ax1.set(xlabel="t [s]", ylabel="q [rad]", title=f"One joint, J q'' = tau, wn = {wn} rad/s")
    ax1.legend(fontsize=8)

    def f(q, qd, tau):
        return forward_dynamics(lambda x: planar2r_mass_matrix(x, P),
                                lambda x, v: planar2r_coriolis_matrix(x, v, P) @ v + planar2r_gravity(x, P),
                                q, qd, tau)

    q_des = np.array([0.5, 0.3])
    for kp in (50.0, 100.0, 200.0, 400.0):
        Q, _ = simulate(f, [0, 0], [0, 0], 0.002, 1500, "rk4",
                        lambda t, q, qd, kp=kp: lab.pd_torque(q, qd, q_des, kp, 2 * np.sqrt(kp)))
        ax2.plot(np.arange(len(Q)) * 0.002, np.asarray(Q)[:, 0], label=f"Kp={kp:.0f}")
    ax2.axhline(q_des[0], color="k", linestyle=":", label="target")
    ax2.set(xlabel="t [s]", ylabel="q1 [rad]", title="2R arm under gravity: PD alone droops")
    ax2.legend(fontsize=8)
    fig.tight_layout()
    path = outdir / "lab21_pd_control.png"
    fig.savefig(path, dpi=120)
    return path
