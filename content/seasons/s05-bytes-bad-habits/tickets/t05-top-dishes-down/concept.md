**Tuples, unpacking and sorting with key=**

A *tuple* is a small, fixed group of values in round brackets, like `("margherita", 41)`: a dish and its count. `dish, count = pair` *unpacks* it into two names, and so does `for dish, count in pairs:`. Unpacking only works if each item really has exactly two parts.

`counts.items()` gives a dictionary's (key, value) pairs. `sorted(things, key=f)` sorts by whatever `f` returns for each item.

Think of a race results board: each line is (runner, time). You sort the lines by the time column, but you keep the whole line together.

```python
pairs = [("tea", 2), ("margherita", 41), ("lemonade", 30)]
dish, count = pairs[1]
print(dish, count)  # margherita 41
def by_count(pair):
    return pair[1]
print(sorted(pairs, key=by_count))  # [('tea', 2), ('lemonade', 30), ('margherita', 41)]
print(sorted(pairs, key=by_count, reverse=True)[0])  # ('margherita', 41)
```

A key can return a tuple too: Python compares the first items, and only looks at the second ones on a tie. `(-count, dish)` puts big counts first, then names A-Z.

**Sorting a dictionary gives keys.** `sorted(counts)` sorts the dictionary's KEYS only, plain strings. `for dish, count in ["margherita"]` then tries to unpack the 10 letters of "margherita" into two names: `ValueError: too many values to unpack`.

When an AI explains an error, compare its story with the traceback's last line and the line it points at. If they don't match, trust the traceback.
