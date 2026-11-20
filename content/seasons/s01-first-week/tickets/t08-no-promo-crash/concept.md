**None**

`None` is Python's way of saying "there's no value here". It's often used for something optional that the user didn't fill in.

Think of a form with an optional "Apartment number" box. Leaving it blank isn't the same as writing "0"; it means *nothing was given*. `None` is that blank box.

```python
nickname = None
if nickname is None:
    print("No nickname given")  # No nickname given
else:
    print(nickname.upper())
```

Check for it with `is None` (or `is not None`). The `else:` part runs only when the `if` was not true, so here `.upper()` is never reached. `None` is not a string, a number or a list, so it has none of their abilities.

**Watch out:** Calling a string method like `.lower()` on `None` crashes with `AttributeError: 'NoneType' object has no attribute ...`. If a value is optional, check for `None` before you treat it like a string.

**AI check:** when AI code calls a method on an optional value, look for an `is None` check before it.
