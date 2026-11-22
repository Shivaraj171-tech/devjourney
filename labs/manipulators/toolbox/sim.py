"""Two interchangeable "robots" for control labs.

Both expose the same tiny interface, so a controller written once runs on either:

    sim.q            -> current joint positions (n,)
    sim.ee_pose()    -> 4x4 end-effector pose (measured)
    sim.jacobian()   -> 6 x n geometric Jacobian [Jv; Jw] at the current q (measured)
    sim.step(qdot, dt)  -> command joint velocities for dt seconds

KinematicSim: pure numpy, joints follow the command perfectly (q += qdot dt).
MujocoSim:    the arm is a real MuJoCo multibody with gravity, inertia, joint damping and
              motor armature; each joint is driven by a stiff position servo that tracks the
              integrated velocity command (how industrial arms are usually commanded). Its
              pose and Jacobian come from MuJoCo itself (mj_forward + mj_jacSite).
"""

from __future__ import annotations

import numpy as np


def mujoco_available() -> bool:
    try:
        import mujoco  # noqa: F401
        return True
    except ImportError:
        return False


class KinematicSim:
    name = "numpy-kinematic"

    def __init__(self, dh, q0):
        from labs.manipulators.lab07_poe.solution import screws_from_dh
        self.M, self.S = screws_from_dh(dh)
        self._q = np.array(q0, dtype=float)

    @property
    def q(self):
        return self._q.copy()

    def ee_pose(self):
        from labs.manipulators.lab07_poe.solution import fk_space
        return fk_space(self.M, self.S, self._q)

    def jacobian(self):
        from labs.manipulators.lab09_jacobian.solution import geometric_jacobian
        return geometric_jacobian(self.M, self.S, self._q)

    def step(self, qdot, dt):
        self._q = self._q + np.asarray(qdot, dtype=float) * dt


class MujocoSim:
    name = "mujoco"

    def __init__(self, dh, q0, kp: float = 2000.0, damping: float = 30.0,
                 armature: float = 0.1, timestep: float = 0.002, gravity: bool = True):
        import mujoco
        from labs.manipulators.lab08_sim_fk.solution import dh_to_mjcf

        self._mj = mujoco
        xml = dh_to_mjcf(dh, "arm_sim")
        xml = xml.replace('damping="1"', f'damping="{damping}" armature="{armature}"')
        g = "0 0 -9.81" if gravity else "0 0 0"
        option = f'  <option timestep="{timestep}" gravity="{g}" integrator="implicitfast"/>'
        actuators = "\n".join(f'    <position joint="j{i + 1}" kp="{kp}"/>' for i in range(len(dh)))
        # gravity compensation, as a real arm controller does (MJCF body attribute gravcomp)
        xml = xml.replace('<body name=', '<body gravcomp="1" name=')
        xml = xml.replace('  <worldbody>', option + "\n  <worldbody>", 1)
        xml = xml.replace("</mujoco>", f"  <actuator>\n{actuators}\n  </actuator>\n</mujoco>")
        self.xml = xml
        self.model = mujoco.MjModel.from_xml_string(xml)
        self.data = mujoco.MjData(self.model)
        self.data.qpos[:] = q0
        self.q_des = np.array(q0, dtype=float)
        self.data.ctrl[:] = self.q_des
        # settle under gravity with the servo holding q0 (a real arm is already at rest)
        for _ in range(int(0.5 / timestep)):
            mujoco.mj_step(self.model, self.data)
        mujoco.mj_forward(self.model, self.data)
        self._site = self.model.site("ee").id

    @property
    def q(self):
        return self.data.qpos.copy()

    def ee_pose(self):
        T = np.eye(4)
        T[:3, :3] = self.data.site_xmat[self._site].reshape(3, 3)
        T[:3, 3] = self.data.site_xpos[self._site]
        return T

    def jacobian(self):
        jacp = np.zeros((3, self.model.nv))
        jacr = np.zeros((3, self.model.nv))
        self._mj.mj_jacSite(self.model, self.data, jacp, jacr, self._site)
        return np.vstack([jacp, jacr])

    def step(self, qdot, dt):
        self.q_des = self.q_des + np.asarray(qdot, dtype=float) * dt
        self.data.ctrl[:] = self.q_des
        for _ in range(max(1, int(round(dt / self.model.opt.timestep)))):
            self._mj.mj_step(self.model, self.data)
        self._mj.mj_forward(self.model, self.data)  # refresh poses/Jacobian inputs for the new state
