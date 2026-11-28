**From:** Orbit Orders alerts (packing floor, paging: you)
**Ticket:** INC-105: Grabby is swinging like a pendulum

INC-105 P1. Packing line DOWN.
Shoulder target 90°. Overshot to 140°, then swung back down through 90° at full speed.
E-stop fired. Box #412 on the floor.
Last change: `pid_step` in `grabby/pid.py`, "tidied up" by Byte last night. Gains unchanged since yesterday, when Grabby was rock steady.
Logs: in the Logs panel.

**From:** Maya (Tech Lead)

Get the shoulder to 90° with under 5% overshoot, settled within 2.5 s. The Lab viewer plots the shoulder's angle against the 90° target, so you can watch the swing calm down.
