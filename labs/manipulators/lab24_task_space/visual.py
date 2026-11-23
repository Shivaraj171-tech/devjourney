"""Paths of the 2R tip to a Cartesian target: Jacobian transpose vs operational space control."""

import numpy as np


def main(lab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    from labs.manipulators.toolbox import (
        forward_dynamics, planar2r_coriolis_matrix, planar2r_gravity, planar2r_mass_matrix, simulate,
    )
    from labs.manipulators.toolbox.robots import PLANAR2R_DYN as P

    def mass(q):
        return planar2r_mass_matrix(q, P)

    def f(q, qd, tau):
        return forward_dynamics(mass, lambda x, v: planar2r_coriolis_matrix(x, v, P) @ v
                                + planar2r_gravity(x, P), q, qd, tau)

    q0 = np.array([-0.5, 1.2])
    x0 = lab.planar2r_fk(q0, P)
    fig, ax = plt.subplots(figsize=(6, 5))
    for target in ([1.2, 0.6], [0.6, -0.9], [0.2, 1.2]):
        target = np.array(target)
        for name, style in (("J^T", "-"), ("OSC", "--")):
            def ctrl(t, q, qd, name=name, target=target):
                J, e, g = lab.planar2r_jacobian(q, P), target - lab.planar2r_fk(q, P), planar2r_gravity(q, P)
                if name == "J^T":
                    return lab.jacobian_transpose_control(J, qd, e, 100.0, 20.0, g)
                return lab.operational_space_control(J, mass(q), qd, e, 100.0, 20.0, g)
            Q, _ = simulate(f, q0, [0, 0], 0.001, 2000, "rk4", ctrl)
            X = np.array([lab.planar2r_fk(q, P) for q in Q])
            ax.plot(X[:, 0], X[:, 1], style, color="C0" if name == "J^T" else "C1",
                    label=name if target[0] == 1.2 else None)
        ax.plot(*target, "kx")
    ax.plot(*x0, "ko", label="start")
    ax.set(xlabel="x [m]", ylabel="z [m]", aspect="equal",
           title="2R tip paths (Kp = 100, Kd = 20, gravity compensated)")
    ax.legend()
    fig.tight_layout()
    path = outdir / "lab24_task_space.png"
    fig.savefig(path, dpi=120)
    return path
