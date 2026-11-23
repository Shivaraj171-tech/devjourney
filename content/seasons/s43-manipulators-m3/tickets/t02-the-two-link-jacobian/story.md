**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-302: The Jacobian, on paper ✍️

The numeric Jacobian works, but it costs four forward-kinematics runs per pose and tells us nothing about WHY the arm moves the way it does. For the two-link arm we can differentiate by hand and get a formula: `vel/jacobian2.py`.
Byte derived it this morning and checked it "at q1 = 0, against the numeric one: perfect". Then the controller's speed estimates drifted as soon as the shoulder turned. Ticket 1's numeric Jacobian is our referee: they must agree at every pose.
In the 3D view the elbow straightens out. The two arrows are the Jacobian's columns (joint 1 alone, joint 2 alone) and the ellipse is every velocity the gripper can reach with joint speeds of size 1. Watch what happens to it when the arm is stretched.
