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
- Conventions: twists (omega, v); quaternions [w, x, y, z]; standard (distal) DH;
  the geometric Jacobian is [Jv; Jw]. Modules 4-6 add: wrenches (m, f); spatial
  inertia diag(I, m, m, m); IK errors as the body twist log(T_sb^-1 T_sd); angles
  wrapped to (-pi, pi].
- If you do write code on request, keep functions small and leave one meaningful
  `TODO(human)` for them where it makes sense (this pairs with the coach).
