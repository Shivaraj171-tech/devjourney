**Hallucinated APIs**

AI assistants learn from millions of codebases, so they're very good at guessing what a function is *probably* called. Sometimes they guess a name that sounds perfect but doesn't exist in *your* code. This is called a *hallucinated API*.

It's like a new colleague confidently sending a letter to "the Billing Department" when your company calls it "Accounts". It looks right, and it bounces.

Python makes this sneaky: `import app.refunds` only checks the *module* exists. A missing function is looked up when that line runs.

```python
import math

def area(r):
    return math.circle_area(r)  # there's no such function

print("imported fine")  # imported fine
area(2)  # AttributeError: module 'math' has no attribute 'circle_area'
```

**Watch out:** "It imports" and "it compiles" don't prove a function exists. For every function an AI's code calls, open the module and find the `def`, or run that line once.
