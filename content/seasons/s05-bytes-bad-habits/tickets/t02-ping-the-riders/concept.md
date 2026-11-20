**while loops**

A `for` loop walks through something you already have, like a list. A `while` loop keeps going *as long as a condition is true*, which is what you need when you don't know in advance how many rounds it will take: "keep retrying while the wait is short enough".

Think of stirring a sauce "until it thickens". Nobody tells you "stir 40 times"; you check before every stir, and you stop as soon as the check says so.

```python
wait = 1
while wait <= 8:
    print(wait)       # prints 1, then 2, 4 and 8
    wait = wait * 2
print("stop at", wait)  # stop at 16
```

Every `while` loop needs three things: a **start** (`wait = 1`), a **step** that changes something each round (`wait = wait * 2`), and a **condition** that the step eventually makes false. The order inside the body matters too: use the value, *then* step, or you skip the first value.

**Watch out:** If nothing in the body moves the condition towards false, the loop never ends and the program freezes. Starting at `wait = 0` does it too: `0 * 2` is still `0`.

**AI check:** for every `while` an AI writes, trace the first round and the last round by hand, and point at the line that makes it stop.
