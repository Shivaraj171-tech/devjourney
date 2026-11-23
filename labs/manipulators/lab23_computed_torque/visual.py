"""Tracking error along a quintic on the 2R arm: computed torque (exact and +-20% masses) vs PD + g."""

import numpy as np


def main(lab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    from labs.manipulators.toolbox import (
        forward_dynamics, planar2r_coriolis_matrix, planar2r_gravity, planar2r_mass_matrix, simulate,
    )
    from labs.manipulators.toolbox.robots import PLANAR2R_DYN as P

    def fns(p):
        return (lambda x: planar2r_mass_matrix(x, p),
                lambda x, v: planar2r_coriolis_matrix(x, v, p) @ v + planar2r_gravity(x, p))

    M, b = fns(P)
    q0, q1, T, dt, steps = np.array([-1.2, 0.3]), np.array([0.8, -0.6]), 1.5, 0.001, 2500
    ref = lab.quintic_reference(q0, q1, T)
    t = np.arange(steps + 1) * dt
    Qr = np.array([ref(tk)[0] for tk in t])
    Kp, Kd = lab.critically_damped_gains(10.0)
    runs = {"PD + g(q)": lambda tk, q, qd: lab.pd_gravity_tracking(
        q, qd, ref(tk), Kp, Kd, lambda x: planar2r_gravity(x, P))}
    for factor in (0.8, 1.2, 1.0):
        Mf, bf = fns(lab.scale_masses(P, factor))
        runs[f"computed torque, masses x{factor}"] = (
            lambda tk, q, qd, Mf=Mf, bf=bf: lab.computed_torque(q, qd, ref(tk), Kp, Kd, Mf, bf))
    fig, ax = plt.subplots(figsize=(7, 4))
    for name, ctrl in runs.items():
        Q, _ = simulate(lambda q, qd, tau: forward_dynamics(M, b, q, qd, tau), q0, [0, 0], dt, steps,
                        "rk4", ctrl)
        ax.plot(t, np.linalg.norm(np.asarray(Q) - Qr, axis=1), label=name)
    ax.axvline(T, color="k", linestyle=":", linewidth=1)
    ax.set(xlabel="t [s]", ylabel="|q - q_d| [rad]", yscale="log",
           title="2R arm tracking a 1.5 s quintic (wn = 10 rad/s)")
    ax.legend(fontsize=8)
    fig.tight_layout()
    path = outdir / "lab23_computed_torque.png"
    fig.savefig(path, dpi=120)
    return path
