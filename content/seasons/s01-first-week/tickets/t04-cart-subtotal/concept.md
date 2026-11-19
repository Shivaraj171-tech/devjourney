**Loops**

A *loop* repeats the same steps several times, so you don't have to write them out again and again. A `for` loop runs its indented lines once for each value it is given.

Picture a cashier scanning a basket: pick up an item, add its price, repeat until the basket is empty. `range(n)` gives you the numbers `0, 1, 2, ...` up to, but **not including**, `n`.

```python
for i in range(3):
    print(i)  # prints 0, then 1, then 2

scores = [5, 8, 2]
total = 0
for score in scores:
    total = total + score
print(total)  # 15
```

The second loop goes straight through each value in the list, without counting positions at all.

**Watch out:** "Off by one" mistakes are very common in loops: starting or stopping one step too early or too late. If the last (or first) item seems to be ignored, check exactly where your loop starts and stops.
