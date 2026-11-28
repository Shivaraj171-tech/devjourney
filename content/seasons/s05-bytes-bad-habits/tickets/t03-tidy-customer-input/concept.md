**Slicing and string methods**

Strings come with built-in tools. `.strip()` removes spaces at both ends, `.lower()` and `.upper()` change case, `.startswith("+1")` checks the beginning, `.split(",")` cuts a string into a list, and `", ".join(parts)` glues a list back together. None of them change the original string: they return a new one.

*Slicing* takes a piece by position: `s[start:stop]` goes from `start` up to, but not including, `stop`. Leave a side empty to go to the end. Negative numbers count from the end.

Think of a loaf of bread: `[:3]` is the first three slices, `[-4:]` is the last four, and `[:-4]` is everything *except* the last four.

```python
phone = "+1 555 010 2345"
print(phone[-4:])            # 2345
print(phone[:-4])            # +1 555 010
print(phone.startswith("+1"))  # True
print(" Nuts, dairy ".strip().lower().split(", "))  # ['nuts', 'dairy']
```

`split(",")` keeps the spaces next to the commas: `"a, b".split(",")` is `['a', ' b']`. Strip each part afterwards.

**Options that don't exist.** When AI code passes a keyword to a built-in method (`split(..., strip=True)`), check that the option really exists with `help(str.split)` or one quick run. Python only complains when the line runs.
