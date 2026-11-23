"""Optional demo: replay the lab 28 capstone's joint plan on the real-looking UR5e (MuJoCo Menagerie).

    python labs/manipulators/tools/fetch_menagerie_ur5e.py      # once (~30 MB)
    python labs/manipulators/tools/menagerie_ur5e_replay.py     # headless report
    python labs/manipulators/tools/menagerie_ur5e_replay.py --view   # watch it (needs a display;
                                                                      # on macOS run with mjpython)
    python labs/manipulators/tools/menagerie_ur5e_replay.py --mine   # your lab 28 starter's plan

The plan (six IK waypoints, quintic segments) comes from lab 28 and our UR5E_DH. Two replays:

- kinematic: qpos = q_ref(t). Menagerie's flange ("attachment_site") must sit within 2 mm of our
  DH FK all the way (Menagerie rounds the offsets, see toolbox/menagerie.py).
- servo: ctrl = q_ref(t) into Menagerie's own position actuators (kp 2000 / 500, its masses).
  There is no gravity compensation, so the arm sags a little under load: compare with lab 11's
  servos (which add gravcomp) and with lab 28's computed torque.

The Menagerie model has no gripper or box: this is a look at the motion, not the grasp.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from labs.manipulators.toolbox.menagerie import FLANGE_SITE, load_menagerie_ur5e  # noqa: E402
from labs.manipulators.toolbox.robots import UR5E_DH  # noqa: E402

TARGET = np.array([-0.40, 0.20])
BOX_XY, BOX_YAW, TARGET_YAW = np.array([-0.45, -0.15]), 0.3, -0.2


def capstone_reference(impl=None):
    """(ref, T): lab 28's joint reference ref(t) -> (q, qd, qdd, grip) and its duration."""
    if impl is None:
        from labs.manipulators.lab28_pick_and_place import solution as impl
    wp = impl.plan_waypoints(BOX_XY, BOX_YAW, TARGET, TARGET_YAW)
    return impl.segment_reference(impl.plan_segments(wp))


def replay(model, data, ref, T: float, mode: str = "kinematic", settle: float = 1.0, viewer=None):
    """Replay ref on the Menagerie model. Returns {"t", "q_ref", "q", "flange", "flange_dh"} (arrays,
    one row per control step of model.opt.timestep)."""
    import mujoco

    from labs.manipulators.toolbox import fk_dh
    site = model.site(FLANGE_SITE).id
    dt = model.opt.timestep
    mujoco.mj_resetData(model, data)
    data.qpos[:6] = ref(0.0)[0]
    data.ctrl[:6] = ref(0.0)[0]
    mujoco.mj_forward(model, data)
    log = {k: [] for k in ("t", "q_ref", "q", "flange", "flange_dh")}
    for k in range(int(round((T + settle) / dt)) + 1):
        t = k * dt
        q_ref = np.asarray(ref(t)[0], dtype=float)
        if mode == "kinematic":
            data.qpos[:6] = q_ref
            data.qvel[:] = 0
            mujoco.mj_kinematics(model, data)
        else:
            data.ctrl[:6] = q_ref
            if k:
                mujoco.mj_step(model, data)
        q = data.qpos[:6].copy()
        log["t"].append(t)
        log["q_ref"].append(q_ref)
        log["q"].append(q)
        log["flange"].append(data.site_xpos[site].copy())
        log["flange_dh"].append(fk_dh(UR5E_DH, q)[:3, 3])
        if viewer is not None:
            viewer.sync()
            time.sleep(dt)
    return {k: np.asarray(v) for k, v in log.items()}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Replay the lab 28 plan on Menagerie's UR5e")
    ap.add_argument("--view", action="store_true", help="open MuJoCo's viewer (needs a display)")
    ap.add_argument("--mine", action="store_true", help="use your lab 28 starter.py's plan")
    args = ap.parse_args(argv)
    loaded = load_menagerie_ur5e()
    if loaded is None:
        print("Menagerie UR5e not found (or MuJoCo missing). Run "
              "python labs/manipulators/tools/fetch_menagerie_ur5e.py first.")
        return 1
    model, data = loaded
    impl = None
    if args.mine:
        from labs.manipulators.lab28_pick_and_place import starter as impl
    ref, T = capstone_reference(impl)
    viewer = None
    if args.view:
        import mujoco.viewer
        viewer = mujoco.viewer.launch_passive(model, data)
    for mode in ("kinematic", "servo"):
        log = replay(model, data, ref, T, mode, viewer=viewer)
        model_gap = np.linalg.norm(log["flange"] - log["flange_dh"], axis=1).max()
        print(f"{mode:9s}: {T:.1f} s plan; Menagerie flange vs our DH FK at the same q: "
              f"max {model_gap * 1e3:.2f} mm; joint tracking max {np.abs(log['q'] - log['q_ref']).max():.4f} rad, "
              f"final {np.abs(log['q'][-1] - log['q_ref'][-1]).max():.4f} rad")
    if viewer is not None:
        viewer.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
