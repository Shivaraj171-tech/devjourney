**Mutable shared data**

Some values can be changed after they are created. Lists and dictionaries are *mutable*: `.append()` changes the list in place. When two variables point at the **same** list, a change through one shows up in the other.

Think of a shared online document. If you and a friend both have the link, you're not each holding a copy: you're both editing one document, so you see each other's changes.

```python
first = []
second = first        # not a copy: the same list
second.append("tea")
print(first)          # ['tea']

third = []            # a brand-new, separate list
print(third)          # []
```

`second = first` doesn't copy anything; it gives the same list a second name. Writing `[]` again creates a new list.

**Watch out:** A default value in a function's `def` line is created once, when Python reads the `def`, not each time the function is called. A mutable default like a list can quietly be shared between calls.
