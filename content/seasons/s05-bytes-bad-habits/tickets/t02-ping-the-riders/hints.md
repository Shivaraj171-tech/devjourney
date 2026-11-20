Trace `retry_waits(8)` by hand, one round at a time: write down `wait` and `waits` after every line inside the loop. What is the first number that goes into `waits`? What is the last?
---
The start (`wait = 1`) and the condition (`wait <= max_wait`) are right. The problem is the ORDER inside the loop: Byte doubles `wait` before saving it, so 1 is never saved, and the last doubled value (16) gets in even though it's over the limit.
---
Inside the loop you need two lines: one saves the current wait into `waits`, the other doubles it. Which one must run first, so that the value saved is always one the condition just checked?
