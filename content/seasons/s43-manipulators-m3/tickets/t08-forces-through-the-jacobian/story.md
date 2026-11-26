**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-308: How hard do the motors push? 💪

Grabby's next job: hold a 2 kg box still in mid-air while a scanner reads its label. The motor drivers want a torque for each joint, and the Jacobian answers that too: the matrix that sends joint speeds OUT to the gripper also links gripper forces BACK to the joints.
`vel/statics.py` computes the holding torques, and Byte wrote it. The torques it gives look reasonable at a glance, and the shoulder supposedly holds nothing when the arm is straight out and level. Ask your own shoulder about that.
The 3D view lifts the box: the arrow is the force the gripper pushes up with, and the chart shows the shoulder and elbow torques from YOUR code.
