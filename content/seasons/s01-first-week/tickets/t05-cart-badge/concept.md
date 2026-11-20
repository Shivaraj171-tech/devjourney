**Changing lists**

You already know how to read a list: `cart[0]` is the first item and `len(cart)` counts them. Today the list has to *change*: lists can grow and shrink while your program runs.

Think of a shopping list on the fridge: you add new things to the bottom as you remember them, and anyone who looks at it afterwards sees the new line.

```python
snacks = ["chips", "nuts"]
snacks.append("popcorn")
print(snacks)       # ['chips', 'nuts', 'popcorn']
print(len(snacks))  # 3
```

`.append(value)` adds a value to the end of the list. It changes *that* list itself, so every part of the program holding the same list sees the new item. That's why a function that appends to a list it was given doesn't need to return anything.

(In today's starter code, `pass` is a placeholder that does nothing, and `# TODO` marks the spot to fill in.)

**Watch out:** `.append()` changes the list and gives back nothing (`None`). Writing `snacks = snacks.append("tea")` throws your list away. Just call `snacks.append("tea")` on its own line.
