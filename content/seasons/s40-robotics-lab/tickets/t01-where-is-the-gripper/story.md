**From:** Rosa (Robotics Engineer)
**Ticket:** LAB-101: Grabby grabs thin air

Hi, I'm Rosa, I look after Grabby, our new packing arm. 🤖 This morning I told it "shoulder 90°, elbow 0°", which should point straight up, and it swung its gripper towards the fridge instead.
Everything Grabby does starts with one question: *given the joint angles, where is the gripper?* Byte wrote `forward()` in `grabby/arm.py` overnight, and every other module will trust it.
Please fix it so the gripper lands where the geometry says. Run the checks: the 🔭 Lab viewer draws the real arm next to a pink cross where your `forward()` thinks the gripper is.
