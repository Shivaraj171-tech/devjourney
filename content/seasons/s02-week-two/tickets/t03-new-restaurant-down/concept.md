**Tracebacks**

When Python hits an error it can't handle, it stops and prints a *traceback*: a report of where the program was and what went wrong. It looks scary, but it's the most useful clue you'll get.

Think of it like a trail of footprints leading to the spot where someone tripped. Read it **from the bottom up**: the last line names the error, and the lines above show the chain of function calls that led there, with the deepest call last.

```python
def per_person(total_cents, people):
    return total_cents // people

print(per_person(1200, 3))  # 400
print(per_person(1200, 0))  # crashes, see below
```

```
Traceback (most recent call last):
  File "split.py", line 5, in <module>
    print(per_person(1200, 0))
  File "split.py", line 2, in per_person
    return total_cents // people
ZeroDivisionError: integer division or modulo by zero
```

**Watch out:** The line that crashes isn't always where the mistake is. Ask *why* that value reached that line: maybe a check exists, but it runs too late to help.
