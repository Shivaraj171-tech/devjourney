**Conditionals**

A *conditional* lets your code make a decision. An `if` statement checks whether something is `True`, and only runs the indented lines below it if it is.

It's like a bouncer at a cinema showing an 18+ film: "if your age is 18 or more, come in." The exact wording matters. "More than 18" would turn away someone who turned 18 today.

```python
age = 18
if age > 18:
    print("greater than")   # (not printed: 18 is not greater than 18)
if age >= 18:
    print("18 or more")     # 18 or more
```

The comparison operators are `>` (greater than), `>=` (greater than or equal to), `<`, `<=`, `==` (equal to) and `!=` (not equal to).

**Watch out:** Most conditional bugs happen right at the boundary. When a rule says "X or more" or "up to X", test the exact value X, not just numbers far above or below it.

**AI check:** for every `>` or `<` an AI writes, ask "or equal?" and try the exact limit.
