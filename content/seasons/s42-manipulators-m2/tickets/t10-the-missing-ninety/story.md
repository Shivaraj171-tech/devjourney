**From:** Maya (Tech Lead)
**Ticket:** INC-210: Grabby-6 reaches for the floor 🚨

Grabby-6 is on site and commissioning stopped at its first pick. The planner sent the same joint angles that worked in last week's simulation, and the arm went for a point 70 cm away, gripper pointing sideways, until the safety system aborted the motion. The boot self-test failed too. Everything is in the Logs panel.
This morning Byte "tidied" `kin/grabby6.py`: the DH table from the vendor's sheet, plus the gripper, whose fingertips sit 0.12 m beyond the flange. Rosa says the commit message worries her more than the code: "tidy the DH table, one-call gripper_pose".
The 3D view draws every joint frame from your `grabby6.py`, from home to the planner's pick. When it's fixed, the fingertips land on box #212, pointing straight down. And please explain in the PR what went wrong, so it doesn't happen again on the next arm.
