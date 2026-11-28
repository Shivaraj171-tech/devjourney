**Code review**

A *code review* is when another developer reads a change before it goes live, looking for bugs the author missed. Code from a person or an AI gets checked the same way.

Think of proofreading a friend's recipe before they print 500 copies: you check each step against the dish it promises, and imagine actually cooking it.

A good review has three steps:

1. **Read the description and docstrings.** What is the code *supposed* to do?
2. **Check each line against that promise.** Plug in a real example and work out the result.
3. **Look for edge cases and side effects.** Empty lists, exact limits, and data that gets changed by accident.

```python
def free_drink(item_count):
    """Orders with 3 or more items get a free drink."""
    return item_count > 3

print(free_drink(3))  # False, but the docstring promises True
```

**Right answer, changed input.** Bugs aren't only wrong numbers. A function can return the right-looking answer while quietly changing something it was handed. And only flag real problems: "looks unusual" is not the same as "is wrong".
