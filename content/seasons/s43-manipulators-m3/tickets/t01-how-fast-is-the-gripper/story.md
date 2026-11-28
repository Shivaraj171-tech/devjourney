**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-301: Joint speeds in, gripper speed out

Module 2 said WHERE the gripper is. The packing line now asks how FAST it's moving. Boxes come down the conveyor at a known speed and the gripper has to match it, so we need the gripper's velocity for any joint speeds.
Start without clever maths: move the joints a tiny bit, run forward kinematics, see how far the gripper went. Byte wrote `vel/numeric.py` to do exactly that, a central difference. Its report: "the velocity comes out a bit slow, maybe the arm is slow". Arms are not slow by a factor of exactly two.
The 3D view draws the two-link arm turning at constant joint speeds for one second, with YOUR velocity as an arrow at the gripper. If it's right, the arrow is tangent to the path and points to where the gripper will be a moment later.
