**try / except, done right**

`try:` runs some code; if it raises an error, Python jumps to the matching `except` block instead of crashing. Name the error you *expect*: `int("15%")` raises `ValueError`, so `except ValueError:` handles a bad tip box and nothing else.

Think of a smoke detector for the kitchen. One that only beeps at smoke is useful. One that's switched off so it never beeps is "quiet", but you'd never know about a fire. `except Exception:` is the switched-off detector: it catches *every* error, including bugs in your own code.

```python
def tip_percent(text):
    try:
        return int(text)
    except ValueError:
        return f"not a whole number: {text}"

print(tip_percent("15"))   # 15
print(tip_percent("15%"))  # not a whole number: 15%
```

Keep the `try` small (just the line that can fail for a known reason), and make the `except` say something useful: what went wrong and how to fix it.

**Loud crashes, quiet wrong answers.** A bare `except:` or `except Exception:` with a default like `0` turns a crash into a wrong answer. Crashes are loud and get fixed; wrong answers stay quiet for weeks.

When AI code says "can never crash", look for `except Exception` or a bare `except:`, and ask which error it really meant to catch.
