Two different checks fail. Look at the "Joint angles" chart in the Lab viewer: does the line reach the goal? Then the "Biggest turn per tick" chart: which ticks go over the dashed 3° line? Compare the first test (5 steps) with `joint_path`'s loop: how many times does it run?
---
`range(steps)` gives 0 to steps - 1, so `t` stops at (steps - 1) / steps and the goal pose is missing: you need steps + 1 poses. And `steps_needed` only measures the shoulder's turn, but home to the shelf turns the elbow 120° and the shoulder only 30°.
---
In `joint_path`, the loop must also run for `i = steps` (one extra pose). In `steps_needed`, `biggest_turn` must be the larger of the shoulder's turn and the elbow's turn: Python has a built-in that picks the larger of two numbers. What goes inside it?
