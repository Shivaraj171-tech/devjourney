**From:** Rosa (Robotics Engineer)
**Ticket:** LAB-101: Grabby grabs thin air

Rosa. I look after Grabby, our new packing arm.
This morning I sent it shoulder 90°, elbow 0°. That should point straight up. The gripper swung towards the fridge.
Everything Grabby does starts from one question: *given the joint angles, where is the gripper?* Byte wrote `forward()` in `grabby/arm.py` overnight, and every other module will trust it.
Fix it so the gripper lands where the geometry says. Run the checks. The Lab viewer draws the real arm next to a pink cross where your `forward()` thinks the gripper is.
