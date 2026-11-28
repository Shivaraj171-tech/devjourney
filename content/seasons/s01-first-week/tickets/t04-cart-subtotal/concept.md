**Loops**

The cart in today's code is a *list*: several values in order, inside square brackets, like `prices = [1250, 450, 299]`. `len(prices)` is how many items it has (3). `prices[0]` is the first item, because positions start at **0**, so the last one is `prices[2]`.

A *loop* repeats the same steps for you. A `for` loop runs its indented lines once for each value it is given. Picture a cashier scanning a basket: pick up an item, add its price, repeat until the basket is empty.

`range(n)` gives the numbers `0, 1, 2, ...` up to, but **not including**, `n`. That's exactly one number per position in a list of length `n`.

```python
scores = [5, 8, 2]
total = 0
for i in range(len(scores)):
    print(i, scores[i])  # 0 5, then 1 8, then 2 2
    total = total + scores[i]
print(total)  # 15
```

"Off by one" mistakes are very common in loops: starting or stopping one step too early or too late. If the last (or first) item seems to be ignored, check exactly where your loop starts and stops.

**A 2-item list catches it.** When an AI writes a loop, check where the range starts and stops, and try it on a 2-item list.
