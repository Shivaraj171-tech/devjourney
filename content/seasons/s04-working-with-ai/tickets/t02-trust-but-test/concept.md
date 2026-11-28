**Test-first verification**

When an AI writes a function for you, don't ask "does this code look right?" Ask "does it do what the spec says?" The best way to answer is to write tests from the *spec*, before you look closely at the code. Each rule in the spec becomes one or more examples with an expected answer.

It's like checking a delivery against your order list instead of the driver's receipt: if you check against the receipt, you'll agree with its mistakes.

```python
def shipping(kg):          # AI-written
    return 5 if kg >= 10 else 0

# Spec: "MORE than 10 kg pays $5"
print(shipping(11) == 5)   # True
print(shipping(10) == 0)   # False
```

The second check comes from the spec's edge and catches the `>=` slip.

**Tests that agree by definition.** Don't copy the code's logic into your tests (like `expected = 5 if kg >= 10 else 0`). Then the test agrees with the code by definition, mistakes included. Write the expected numbers yourself, from the spec.
