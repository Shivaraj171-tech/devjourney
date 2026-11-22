**Trajectories (linear interpolation)**

A trajectory is the list of poses a robot is sent, one per tick, to get from A to B. The simplest one blends the joint angles in a straight line: at fraction `t` of the way (0 at the start, 1 at the goal), each angle is `start + (goal - start) * t`. Like a dimmer slider, every joint slides from its old value to its new one at an even pace.

`steps` steps need `steps + 1` poses (fence posts and gaps), so `t` runs over `0/steps, 1/steps, ..., steps/steps`:

```python
start, goal, steps = 0, 30, 3
for i in range(steps + 1):
    t = i / steps
    print(start + (goal - start) * t)  # 0.0, 10.0, 20.0, 30.0
```

How many steps? Enough that the joint with the **biggest** turn stays under the motor's limit per tick: `ceil(biggest_turn / max_step)`. Every other joint then moves less than that per tick.

**Watch out:** `range(steps)` stops before `steps`, so `t` never reaches 1 and the goal pose is never sent. And sizing the steps from one joint only lets the others jump.

**AI check:** for any path an AI generates, print the first pose, the last pose and the largest change between two neighbours. Those three numbers catch most trajectory bugs.
