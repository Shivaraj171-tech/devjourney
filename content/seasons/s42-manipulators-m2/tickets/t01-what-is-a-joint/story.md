**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-201: The lift that turns

Orbit Orders has signed for a real six-joint arm. Before it arrives we build Grabby's **forward kinematics**: joint angles in, gripper pose out. Module 1 gave you the tools (`rigid/`: rotations, 4x4 transforms, chains). This module adds a new package, `kin/`, one joint at a time.
First, the vocabulary. Our test rig has three joints: a turntable that **turns**, a lift that **slides** up, and a wrist that **rolls**. Byte wrote `kin/joints.py`, and the rig's lift spins on the spot instead of rising. Byte also wrote a function that counts an arm's **degrees of freedom**. It says our six-joint arm will have twelve.
The 3D view draws the rig with a frame (a triad) on every joint, so you can see what each joint does to the frames after it.
