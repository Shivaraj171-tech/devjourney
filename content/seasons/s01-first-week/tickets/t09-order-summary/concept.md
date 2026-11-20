**Functions**

You've been fixing functions all week. Today you'll build one out of others, which needs two more ideas.

**Using code from another file.** `from app.cart import cart_subtotal` means "from the file `app/cart.py`, let me use the function `cart_subtotal`". After that line you can call it as if it were written right here.

**Optional inputs.** In `def order_summary(prices, promo_code=None):`, the `=None` makes `promo_code` optional: if the caller leaves it out, it is `None`.

Think of a coffee machine: you press one button and it grinds, heats and pours by calling its own smaller parts.

```python
def add_tax(cents):
    return cents + cents * 10 // 100

def price_label(cents, currency="cents"):
    total = add_tax(cents)
    return f"{total} {currency}"

print(price_label(500))  # 550 cents
```

`price_label` doesn't repeat the tax maths. It calls `add_tax` and stores the returned value in `total`.

**Watch out:** Pass each function the inputs it expects, in the right order. And a value only comes out of a function if it is returned; a function with no `return` gives back `None`.
