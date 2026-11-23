**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-301: Joint speeds in, gripper speed out 🏎️

Module 2 told us WHERE Grabby's gripper is. The packing line now asks a harder question: how FAST is it moving? Boxes come down a conveyor at a known speed, and the gripper has to match it, so we need the gripper's velocity for any joint speeds.
Before any clever maths, the honest way: move the joints a tiny bit, run forward kinematics, and see how far the gripper went. Byte wrote `vel/numeric.py` to do exactly that, a central difference, and reports "the velocity comes out a bit slow, maybe the arm is slow". Arms are not slow by a factor of exactly two.
The 3D view draws the two-link arm turning at constant joint speeds for one second, with YOUR velocity as an arrow at the gripper. Right, the arrow is tangent to the path and points to where the gripper will be a moment later.
