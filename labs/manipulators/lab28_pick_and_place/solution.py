"""Lab 28 reference solution: pick and place with the UR5e in MuJoCo, using your IK (lab 14),
quintic trajectories (lab 16), computed-torque control (lab 23) and a force-controlled two-finger
gripper (labs 26-27). The box is held by contact friction only: no welds, no teleporting."""

from __future__ import annotations

import numpy as np

from labs.manipulators.lab01_rotations.solution import rot_x, rot_z
from labs.manipulators.lab05_transforms.solution import make_transform
from labs.manipulators.lab07_poe.solution import body_screws, fk_space, screws_from_dh
from labs.manipulators.lab12_analytic_ik.solution import wrap_to_pi
from labs.manipulators.lab14_dls_ik.solution import ik_lm
from labs.manipulators.lab16_time_scaling.solution import quintic_scaling
from labs.manipulators.lab23_computed_torque.solution import computed_torque
from labs.manipulators.toolbox.models import BOX_HALF, GRIPPER_TCP
from labs.manipulators.toolbox.robots import UR5E_DH, UR5E_Q_MAX, UR5E_Q_MIN

Q_HOME = np.array([0.0, -np.pi / 2, np.pi / 2, -np.pi / 2, -np.pi / 2, 0.0])
HOME_YAW = np.pi / 2       # at Q_HOME the gripper's y axis (finger direction) is world -x
GRASP_Z = BOX_HALF + 0.005  # TCP height when grasping: pads clear the table by 5 mm
HOVER_Z = 0.12              # above the box before descending / after placing
CARRY_Z = 0.20              # transport height
OPEN, CLOSE = -5.0, 15.0    # finger motor forces [N]: hold open against the stops / squeeze


def tool_model():
    """(M_tool, S, B_tool): the UR5e's PoE model with the end-effector frame moved GRIPPER_TCP
    along the flange z axis, to the point between the finger pads."""
    M, S = screws_from_dh(UR5E_DH)
    M_tool = M @ make_transform(np.eye(3), [0.0, 0.0, GRIPPER_TCP])
    return M_tool, S, body_screws(M_tool, S)


def tool_pose(xy, z: float, yaw: float) -> np.ndarray:
    """TCP pose pointing straight down (tool z = world -z) with the fingers closing along
    rot_z(yaw) applied to world y: R = Rz(yaw) Rx(pi)."""
    return make_transform(rot_z(yaw) @ rot_x(np.pi), [xy[0], xy[1], z])


def grasp_yaw(box_yaw: float, ref: float = HOME_YAW) -> float:
    """A cube looks the same every quarter turn: of box_yaw + k pi/2, take the one closest to ref
    (so the wrist turns as little as possible)."""
    cands = box_yaw + np.arange(-4, 5) * np.pi / 2
    return float(cands[np.argmin(np.abs(wrap_to_pi(cands - ref)))])


def plan_waypoints(box_xy, box_yaw: float, target_xy, target_yaw: float, q_start=Q_HOME) -> dict:
    """Joint configurations for "pre", "grasp", "lift", "carry", "place", "retreat", each solved by
    ik_lm (joint limits UR5E_Q_MIN/MAX) warm-started from the previous one, so the arm stays on
    one IK branch. The place yaw turns the box from box_yaw to target_yaw. Raises RuntimeError if
    any IK fails."""
    M_tool, _, B_tool = tool_model()
    ya = grasp_yaw(box_yaw)
    yb = float(ya + wrap_to_pi(target_yaw - box_yaw))
    poses = [("pre", box_xy, HOVER_Z, ya), ("grasp", box_xy, GRASP_Z, ya), ("lift", box_xy, CARRY_Z, ya),
             ("carry", target_xy, CARRY_Z, yb), ("place", target_xy, GRASP_Z + 0.002, yb),
             ("retreat", target_xy, CARRY_Z, yb)]
    q, out = np.asarray(q_start, dtype=float), {}
    for name, xy, z, yaw in poses:
        q, ok, _ = ik_lm(M_tool, B_tool, tool_pose(xy, z, yaw), q, UR5E_Q_MIN, UR5E_Q_MAX)
        if not ok:
            raise RuntimeError(f"IK failed for waypoint {name!r}")
        out[name] = q.copy()
    return out


def plan_segments(wp: dict, q_start=Q_HOME) -> list:
    """[(q_from, q_to, duration, gripper)] with gripper "open" or "close":
    start -> pre 1.5 s open; pre -> grasp 1.0 s open; close at grasp 0.5 s; grasp -> lift 1.0 s;
    lift -> carry 1.5 s; carry -> place 1.0 s (all closed); open at place 0.4 s;
    place -> retreat 0.8 s open."""
    q0 = np.asarray(q_start, dtype=float)
    return [(q0, wp["pre"], 1.5, "open"), (wp["pre"], wp["grasp"], 1.0, "open"),
            (wp["grasp"], wp["grasp"], 0.5, "close"), (wp["grasp"], wp["lift"], 1.0, "close"),
            (wp["lift"], wp["carry"], 1.5, "close"), (wp["carry"], wp["place"], 1.0, "close"),
            (wp["place"], wp["place"], 0.4, "open"), (wp["place"], wp["retreat"], 0.8, "open")]


def segment_reference(segments):
    """(ref, T_total): ref(t) -> (q_d, qd_d, qdd_d, gripper) running the segments one after
    another, each a rest-to-rest quintic; after the last one, hold its end (gripper as last)."""
    starts = np.cumsum([0.0] + [s[2] for s in segments])

    def ref(t):
        i = int(np.searchsorted(starts, t, side="right") - 1)
        if i >= len(segments):
            qa, qb, T, grip = segments[-1]
            return qb.copy(), np.zeros_like(qb), np.zeros_like(qb), grip
        qa, qb, T, grip = segments[i]
        s, sd, sdd = quintic_scaling(t - starts[i], T)
        return qa + s * (qb - qa), sd * (qb - qa), sdd * (qb - qa), grip

    return ref, float(starts[-1])


def make_controller(ref, dyn, wn: float = 20.0, squeeze: float = CLOSE):
    """controller(t, q, qd) for the 8 actuators: computed torque (lab 23) on the 6 arm joints with
    Kp = wn^2, Kd = 2 wn and dyn.mass / dyn.bias (toolbox.sim.MujocoDynamics, arm block), then the
    two finger forces: OPEN, or `squeeze` when the reference says "close". q, qd hold 8 joints
    (arm then fingers)."""
    Kp, Kd = wn**2, 2.0 * wn

    def controller(t, q, qd):
        q_d, qd_d, qdd_d, grip = ref(t)
        tau = computed_torque(q[:6], qd[:6], (q_d, qd_d, qdd_d), Kp, Kd, dyn.mass, dyn.bias)
        f = squeeze if grip == "close" else OPEN
        return np.concatenate([tau, [f, f]])

    return controller


def run_pick_and_place(box_xy, box_yaw: float, target_xy, target_yaw: float = 0.0, mu: float = 1.0,
                       squeeze: float = CLOSE, settle: float = 0.3) -> dict:
    """Build toolbox.models.ur5e_gripper_mjcf, plan, and run the whole task with run_mujoco_control
    (lab 21) for T_total + settle seconds, logging the box and TCP positions every step via
    before_step. Returns {"t", "box" (N, 3), "box_quat" (N, 4), "tcp" (N, 3), "segments_end"
    (cumulative segment end times), "final_box" (3,), "final_yaw"}."""
    import mujoco

    from labs.manipulators.lab21_pd_control.solution import run_mujoco_control
    from labs.manipulators.toolbox.models import ur5e_gripper_mjcf
    from labs.manipulators.toolbox.robots import UR5E_LINKS
    from labs.manipulators.toolbox.sim import MujocoDynamics

    model = mujoco.MjModel.from_xml_string(ur5e_gripper_mjcf(UR5E_DH, UR5E_LINKS, box_xy, box_yaw, mu=mu))
    segments = plan_segments(plan_waypoints(box_xy, box_yaw, target_xy, target_yaw))
    ref, T = segment_reference(segments)
    ctrl = make_controller(ref, MujocoDynamics(model, n=6), squeeze=squeeze)
    box_id, tcp_id = model.body("box").id, model.site("tcp").id
    log = {"t": [], "box": [], "box_quat": [], "tcp": []}

    def record(m, d, t):
        log["t"].append(t)
        log["box"].append(d.xpos[box_id].copy())
        log["box_quat"].append(d.xquat[box_id].copy())
        log["tcp"].append(d.site_xpos[tcp_id].copy())

    run_mujoco_control(model, ctrl, np.concatenate([Q_HOME, [0.0, 0.0]]), T + settle, before_step=record)
    out = {k: np.array(v) for k, v in log.items()}
    out["segments_end"] = np.cumsum([s[2] for s in segments])
    out["final_box"] = out["box"][-1]
    w, _, _, z = out["box_quat"][-1]
    out["final_yaw"] = float(2 * np.arctan2(z, w))
    return out


def placement_error(result, target_xy, target_yaw: float = 0.0):
    """(xy distance [m], yaw error [rad] modulo the cube's quarter-turn symmetry, height [m])."""
    b = result["final_box"]
    dyaw = wrap_to_pi(4 * (result["final_yaw"] - target_yaw)) / 4
    return float(np.linalg.norm(b[:2] - np.asarray(target_xy))), float(abs(dyaw)), float(b[2])


def held_during_transport(result) -> float:
    """Largest |box - tcp| distance while the box should be in the hand: from the end of the
    lift segment (index 3) to the end of the lower-to-place segment (index 5)."""
    t, ends = result["t"], result["segments_end"]
    sel = (t >= ends[3]) & (t <= ends[5])
    return float(np.max(np.linalg.norm(result["box"][sel] - result["tcp"][sel], axis=1)))
