**Numbers**

Python works with two kinds of numbers. *Integers* are whole numbers like `1250`. *Floats* have a decimal point, like `12.5`. You can do maths with them using `+`, `-`, `*` and `/`.

Think of coins in a jar. Counting pennies is exact: you never have "half a penny". That's why many apps store money as whole cents and only turn it into dollars when they show it to someone.

```python
cents = 375
dollars = cents / 100
print(dollars)          # 3.75
print(f"${dollars:.2f}")  # $3.75
print(cents / 10)       # 37.5
```

Dividing with `/` always gives a float. In an f-string, `:.2f` means "show exactly 2 digits after the decimal point".

**Off by ten still looks like a price.** Unit conversions cause a lot of bugs. Before you divide or multiply, ask "how many of the small unit make one big unit?" Being off by a factor of 10 gives a number that still looks believable.

When an AI converts units, plug in one value whose answer you already know (1250 cents is $12.50).
