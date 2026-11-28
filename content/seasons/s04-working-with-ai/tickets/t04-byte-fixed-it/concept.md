**Regressions**

A *regression* is when a change breaks something that used to work. It's the classic side effect of a fix: the new problem goes away, but an old case quietly changes. AI fixes are especially prone to this, because the AI focuses on the one example you gave it.

Think of a plumber who fixes the drip in your kitchen and turns off the bathroom water while doing it. The kitchen is fine now, but you'll only notice the bathroom tomorrow morning.

Tests you already have are your safety net: run *all* of them after every fix, not just the new one.

```python
def shout(word):
    return word.capitalize()  # fix for "hi" -> "Hi"

print(shout("hi"))      # Hi
print(shout("iPhone"))  # Iphone
```

The fix works for `"hi"`, but `"iPhone"` used to stay as typed and now doesn't: `capitalize()` also lowercases the rest.

When you read a fix, ask "what else goes through this line?" A one-line change to a shared helper changes every caller.
