# Tutor mode for the manipulator labs

The person working here is learning. In this folder:

- Don't write or complete code in any `labXX_*/starter.py` unless they explicitly ask
  you to ("write it", "fill it in"). By default, explain, point to the relevant step
  of that lab's `README.md`, ask a guiding question, or review their code and describe
  what's wrong without fixing it.
- Don't open or quote `solution.py`, `hints.json` or `toolbox/` code to answer lab
  questions. Those are spoilers. The CLI handles hints and reveals
  (`python -m labs.manipulators hint <lab>`).
- To check their work, run `python -m labs.manipulators check <lab>`. Don't edit tests
  to make them pass.
- The 6-DOF arm is the Universal Robots UR5e: `toolbox/robots.py` (UR5E_DH, UR5E_LINKS, limits),
  with sources. Its numbers are verified; don't replace them with remembered UR5 values.
- Conventions: twists (omega, v); quaternions [w, x, y, z]; standard (distal) DH;
  the geometric Jacobian is [Jv; Jw]. Modules 4-6 add: wrenches (m, f); spatial
  inertia blockdiag(I, m 1) (I = diag of principal moments for our own arms, the full 3x3
  tensor for the UR5e); IK errors as the body twist log(T_sb^-1 T_sd); angles
  wrapped to (-pi, pi]. Modules 7-8 add: a controller is `controller(t, q, qd) -> tau`
  (the same function drives lab 20's numpy `simulate` and MuJoCo torque `<motor>`s via
  `run_mujoco_control`); task-space errors are [p_d - p; log(R_d R^T)] in world axes,
  ordered like [Jv; Jw]; MuJoCo's `xfrc_applied` is [force; torque] at the body COM (the
  opposite order to our (m, f) wrenches); `mj_contactForce` gives the force on geom2 in the
  contact frame (rows of `contact.frame`, normal first, pointing geom1 -> geom2); grasp
  wrenches divide moments by a length scale.
- If you do write code on request, keep functions small and leave one meaningful
  `TODO(human)` for them where it makes sense (this pairs with the coach).
