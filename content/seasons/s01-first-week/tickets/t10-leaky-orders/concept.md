**Mutable shared data**

Lists and dictionaries are *mutable*: they can be changed after they are made, like `.append()` does. If two names point at the **same** list, a change through one shows up in the other. Think of a shared online document: you and a friend aren't holding copies, you're both editing one document.

That matters for *default arguments*, the `=something` in a `def` line. The default value is created **once**, when Python reads the `def`, not each time the function is called. So a list default is one list, shared by every call that leaves it out:

```python
def add_tea(cup=[]):
    cup.append("tea")
    return cup

print(add_tea())  # ['tea']
print(add_tea())  # ['tea', 'tea']  <- the same cup again!
```

The usual safe pattern is to use `None` as the default, and make a fresh list *inside* the function, which runs on every call:

```python
def add_coffee(cup=None):
    if cup is None:
        cup = []
    cup.append("coffee")
    return cup

print(add_coffee())  # ['coffee']
print(add_coffee())  # ['coffee']
```

**Watch out:** The bug only appears from the *second* call on, so a single quick test can look perfectly fine.

**AI check:** if an AI writes `=[]` or `={}` in a `def` line, stop and use the `None` pattern instead.
