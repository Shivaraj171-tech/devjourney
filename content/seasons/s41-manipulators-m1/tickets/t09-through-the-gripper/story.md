**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-109: The fingers close on empty air

The shelf camera reports each box in Grabby's **base** frame. But the fingers don't care about the base: to close on a box, the gripper needs to know where the box is **in its own frame**, "30 cm straight ahead of my fingertips". That's `box_in_gripper()` in `rigid/frames.py`.
`chain()` and `gripper_in_base()` already work: they multiply base → shoulder → gripper. Byte wrote `box_in_gripper` with the gripper's pose as it is, and the fingers keep closing on a spot a metre away from the box.
The 3D view shows the base, the shoulder and the gripper tipping down towards the box, plus two pink dots: the real box, and your answer drawn back in the base frame. When your answer is right, the dots meet.
