Try it: call `create_order("Sam")`, add an item to its `items`, then call `create_order("Ana")`. What's in Ana's order? Where did that list come from?
---
A default value like `items=[]` is created **once**, when Python reads the `def` line, not each time the function is called. So every order created without items gets the *same* list. The usual fix is to use `None` as the default and make a fresh list inside the function.
---
Change the line to `def create_order(customer, items=None):` and add `if items is None:` with `items = []` indented underneath, before the `return`.
