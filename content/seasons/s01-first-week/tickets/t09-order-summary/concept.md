**Functions**

A *function* is a named, reusable set of steps. You give it some inputs (called *arguments*), it does its work, and `return` hands a result back to you.

Think of a coffee machine: put in beans and water, press the button, get coffee. You don't need to know what happens inside, and you can use it as often as you like. Bigger functions are often built by calling smaller ones.

```python
def add_tax(cents):
    return cents + cents * 10 // 100

def price_label(cents):
    total = add_tax(cents)
    return f"{total} cents"

print(price_label(500))  # 550 cents
```

Here `price_label` doesn't repeat the tax maths. It calls `add_tax` and stores the returned value in `total`.

**Watch out:** Pass each function the inputs it expects, in the right order. And remember that a value only comes out of a function if it is returned; a function with no `return` gives back `None`.
