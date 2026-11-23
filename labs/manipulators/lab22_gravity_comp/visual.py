"""The 2R arm with PD alone vs PD + gravity compensation, and the Lyapunov function V(t)."""

import numpy as np


def main(lab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    from labs.manipulators.toolbox import (
        forward_dynamics, pd_torque, planar2r_coriolis_matrix, planar2r_gravity, planar2r_mass_matrix,
        simulate,
    )
    from labs.manipulators.toolbox.robots import PLANAR2R_DYN as P

    def g(q):
        return planar2r_gravity(q, P)

    def mass(q):
        return planar2r_mass_matrix(q, P)

    def f(q, qd, tau):
        return forward_dynamics(mass, lambda x, v: planar2r_coriolis_matrix(x, v, P) @ v + g(x), q, qd, tau)

    q_des, kp, kd, dt = np.array([0.5, 0.3]), 50.0, 2 * np.sqrt(50.0), 0.002
    laws = {"PD alone": lambda t, q, qd: pd_torque(q, qd, q_des, kp, kd),
            "PD + g(q)": lambda t, q, qd: lab.pd_gravity(q, qd, q_des, kp, kd, g)}
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4))
    for name, law in laws.items():
        Q, Qd = simulate(f, [-1.0, 0.5], [0, 0], dt, 2000, "rk4", law)
        t = np.arange(len(Q)) * dt
        ax1.plot(t, np.linalg.norm(q_des - np.asarray(Q), axis=1), label=name)
        V = [lab.lyapunov(q, v, q_des, kp, mass) for q, v in zip(Q, Qd)]
        ax2.plot(t, V, label=name)
    ax1.set(xlabel="t [s]", ylabel="|q_des - q| [rad]", yscale="log", title="Joint error")
    ax2.set(xlabel="t [s]", ylabel="V = KE + spring energy [J]", yscale="log",
            title="V only decreases with gravity compensation")
    ax1.legend()
    ax2.legend()
    fig.tight_layout()
    path = outdir / "lab22_gravity_comp.png"
    fig.savefig(path, dpi=120)
    return path
