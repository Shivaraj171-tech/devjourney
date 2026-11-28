**Side effects**

A function's *result* is what it returns. A *side effect* is anything else it changes along the way, such as adding an item to a list that was passed in. Some side effects are the whole point (like `add_item` in week one). Others are accidents.

Imagine asking a friend to add up the prices on your shopping list, and they hand it back with "tip: 10" written at the bottom. You got your answer, but your list is now wrong.

```python
def total_with_bag(prices):
    prices.append(10)  # 10-cent paper bag
    return sum(prices)

cart = [500, 300]
print(total_with_bag(cart))  # 810
print(cart)                  # [500, 300, 10]  <- the cart changed!
```

The caller only wanted a number, but their `cart` now contains a bag that was never ordered.

If calling a function twice gives two different answers, or your data looks different afterwards, look for a line that changes an input (like `.append()`) when the function only needed to *read* it.
