**Refactoring**

*Refactoring* means changing how code is organised without changing what it does. A common case: the same few lines are copy-pasted in several places. Sooner or later someone changes one copy and forgets the others, and the copies quietly start to disagree. Moving those lines into one function fixes that for good.

Think of a recipe card. If three cooks each keep their own copy and the chef changes the recipe, two of them keep cooking the old dish. Pin one card on the wall and everyone stays in sync.

```python
def with_tax(cents):
    return cents + cents * 10 // 100

def menu_price(cents):
    return f"${with_tax(cents) / 100:.2f}"

print(menu_price(1000))  # $11.00
print(with_tax(450))     # 495
```

Every price goes through `with_tax`, so a new tax rate is a one-line change.

**Green before, green after.** Refactor in small steps and run the tests after each one. If the tests were green before, they must still be green after: that's how you know nothing changed by accident.
