"""Pressing the 3-DOF arm's fingertip on a table with impedance control: force and height vs time,
for three stiffnesses. Needs MuJoCo."""

import numpy as np


def main(lab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import mujoco

    from labs.manipulators.toolbox import (
        ARM3_DH, arm3_ik, fk_space, geometric_jacobian, make_gravity_fn, run_mujoco_control, screws_from_dh,
    )
    from labs.manipulators.toolbox.models import arm3_table_mjcf
    from labs.manipulators.toolbox.robots import ARM3_LINKS

    M3, S3 = screws_from_dh(ARM3_DH)
    g = make_gravity_fn(ARM3_DH, ARM3_LINKS)
    table_z, r = 0.10, 0.02
    model = mujoco.MjModel.from_xml_string(arm3_table_mjcf(ARM3_DH, ARM3_LINKS, table_z, tip_radius=r))
    xa, x_goal = np.array([0.5, 0.0, 0.25]), np.array([0.5, 0.0, table_z + r - 0.02])
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(7, 6), sharex=True)
    for kz in (250.0, 500.0, 1000.0):
        K, D = np.diag([400.0, 400.0, kz]), np.diag([40.0, 40.0, 2 * np.sqrt(kz * 2.0)])

        def x0(t):
            s = min(t, 1.0)
            return xa + (10 * s**3 - 15 * s**4 + 6 * s**5) * (x_goal - xa)

        def ctrl(t, q, qd, K=K, D=D):
            return lab.impedance_torque(geometric_jacobian(M3, S3, q)[:3], qd, fk_space(M3, S3, q)[:3, 3],
                                        x0(t), K, D, g(q))
        log = []
        t, Q, _, _ = run_mujoco_control(model, ctrl, arm3_ik(xa, "front", "up"), 2.5, before_step=lambda m, d, tk:
                                        log.append(lab.contact_normal_force(m, d, "tip", "table")))
        ax1.plot(t[:-1], log, label=f"K_z = {kz:.0f} N/m (expect {kz * 0.02:.0f} N)")
        ax2.plot(t, [fk_space(M3, S3, q)[2, 3] for q in Q])
    ax2.axhline(table_z + r, color="k", linestyle=":", label="ball touches the table")
    ax1.set(ylabel="normal force [N]", title="Impedance control pressing 2 cm 'into' a table")
    ax2.set(xlabel="t [s]", ylabel="fingertip centre z [m]")
    ax1.legend(fontsize=8)
    ax2.legend(fontsize=8)
    fig.tight_layout()
    path = outdir / "lab25_impedance.png"
    fig.savefig(path, dpi=120)
    return path
