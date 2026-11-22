**From:** Maya (Tech Lead)
**Ticket:** INC-110: Box #77 went over the conveyor instead of into tray 3 🚨

The packing line is paused. The planner sent Grabby the right joint angles for tray 3 (they haven't changed in two days), but the gripper went somewhere else entirely, hit the safety limit at the shelf edge, and dropped box #77 on the conveyor. The logs are in the Logs panel: look at the self-test lines.
This morning Byte "tidied up" `rigid/place.py`, the function that chains Grabby's frames, base → turntable → wrist → gripper, into the gripper's pose. Rosa thinks there may be more than one thing wrong in there.
Everything you built in this module is in play: rotations, composition order, transforms and chains. The 3D view draws each joint from your chain: the gripper must end on the tray.
