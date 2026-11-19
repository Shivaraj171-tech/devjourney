**Boolean logic**

A *boolean* is a value that is either `True` or `False`. You can combine conditions with three words: `and` (both must be true), `or` (at least one must be true) and `not` (flips true and false).

Think of a fairground ride: you can get on if you're tall enough **and** you have a ticket. If the sign said "or", anyone with a ticket could ride, however small.

```python
tall_enough = True
has_ticket = False
print(tall_enough and has_ticket)  # False
print(tall_enough or has_ticket)   # True
print(not has_ticket)              # True
items = []
print(len(items) > 0 and items[0] == "pizza")  # False
```

`and` stops as soon as it finds a `False`, so in the last line `items[0]` never runs and there's no crash. This is called *short-circuiting*.

**Watch out:** When a rule says "both", make sure *every* part is actually in your condition. And remember that the order of the parts matters: the left side is checked first.
