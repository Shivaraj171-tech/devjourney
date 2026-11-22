Read the logs: at t=1.06s the shoulder is already past 90°, moving fast, and the torque is still +300, pushing it further up. Something that should brake is pushing instead. The first check tests one tick: the error goes from 10 to 8. Which term in `pid_step` reacts to that change?
---
The derivative is "how fast the error is changing": (new error - old error) / dt. Closing in from 10 to 8 should give a NEGATIVE number, so KD * derivative brakes. Work out Byte's line with those two numbers: what sign do you get?
---
Only one line in `pid_step` needs to change: the one that computes `derivative`. Keep dividing by `dt`. Which of `error` and `state["prev_error"]` must come first in the subtraction, so that a shrinking error gives a negative derivative?
