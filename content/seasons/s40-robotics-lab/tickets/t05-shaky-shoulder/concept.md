**PID control**

A controller turns "where I want to be" into "how hard to push", many times a second. Think of parking a car at a line: push harder when you're far away (**P**), add a little if you've been short for a while (**I**), and brake when you're closing in fast (**D**).

Each tick: `error = target - measured`, then

```python
kp, ki, kd, dt = 40, 10, 10, 0.01
integral, prev_error, error = 0.05, 10.0, 8.0
derivative = (error - prev_error) / dt      # -200.0: closing in fast
torque = kp * error + ki * integral + kd * derivative
print(torque)  # -1679.5: brake hard, we'll arrive soon
```

The D part is the brake: while the error shrinks, `error - prev_error` is negative, so D pushes back. Without enough D, the joint overshoots and swings; with D's sign flipped, D pushes *harder* the faster it goes, and the swing grows.

**Watch out:** a sign error in a controller doesn't crash anything. It runs, it moves, and it does exactly the wrong thing, as fast as the motor allows.

**AI check:** when an AI touches a controller, check one tick by hand: if the error is shrinking, does each term push the way you expect? Then look at the response curve, not just the final value.
