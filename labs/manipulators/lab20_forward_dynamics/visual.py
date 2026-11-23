"""Energy drift of explicit Euler, semi-implicit Euler and RK4 on the unpowered 2R arm."""

import numpy as np


def main(lab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    from labs.manipulators.toolbox import (
        planar2r_coriolis_matrix, planar2r_energy, planar2r_gravity, planar2r_mass_matrix,
    )
    from labs.manipulators.toolbox.robots import PLANAR2R_DYN as P

    def f(q, qd, tau):
        return lab.forward_dynamics(
            lambda x: planar2r_mass_matrix(x, P),
            lambda x, v: planar2r_coriolis_matrix(x, v, P) @ v + planar2r_gravity(x, P), q, qd, tau)

    def energy(q, qd):
        return sum(planar2r_energy(q, qd, P))

    dt, steps = 0.005, 4000
    t = np.arange(steps + 1) * dt
    fig, ax = plt.subplots(figsize=(7, 4))
    for method in ("euler", "semi_implicit", "rk4"):
        Q, Qd = lab.simulate(f, [-1.2, 0.3], [0, 0], dt, steps, method)
        ax.plot(t, lab.energy_drift(energy, np.asarray(Q), np.asarray(Qd)), label=method)
    ax.set_xlabel("t [s]")
    ax.set_ylabel("E(t) - E(0) [J]")
    ax.set_title(f"Unpowered, undamped 2R arm, dt = {dt * 1e3:.0f} ms")
    ax.legend()
    fig.tight_layout()
    path = outdir / "lab20_energy_drift.png"
    fig.savefig(path, dpi=120)
    return path
