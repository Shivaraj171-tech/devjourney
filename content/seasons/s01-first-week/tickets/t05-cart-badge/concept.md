**Lists**

A *list* holds several values in order, inside square brackets: `[1250, 450, 299]`. Lists can grow and shrink while your program runs.

Think of a shopping list on the fridge. You can add something to the bottom, count how many things are on it, or look at a particular line.

```python
snacks = ["chips", "nuts"]
snacks.append("popcorn")
print(snacks)       # ['chips', 'nuts', 'popcorn']
print(len(snacks))  # 3
print(snacks[0])    # chips
```

`.append(value)` adds a value to the end of the list. `len(...)` tells you how many items there are. `snacks[0]` gets the first item, because positions start counting at 0.

**Watch out:** `.append()` changes the list itself and gives back nothing (`None`). Writing `snacks = snacks.append("tea")` throws your list away. Just call `snacks.append("tea")` on its own line.
