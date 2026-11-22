**From:** Maya (Tech Lead)
**Ticket:** INC-105: Grabby is swinging like a pendulum 🚨

The packing line is down. Grabby's shoulder was told to go to 90°: it shot past to 140°, then swung back down through 90° at full speed until the e-stop fired and box #412 hit the floor. The logs are in the Logs panel.
Byte "tidied up" the joint controller, `pid_step` in `grabby/pid.py`, last night. The gains haven't changed since yesterday, when Grabby was rock steady.
Get the shoulder to 90° with under 5% overshoot, settled within 2.5 s. The Lab viewer plots the shoulder's angle against the 90° target, so you can see the swing calm down.
