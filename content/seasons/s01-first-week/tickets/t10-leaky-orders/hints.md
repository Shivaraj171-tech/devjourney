Look at the failing check: Ana's brand-new order already has Sam's item in it. To see it happen, add `print(customer, items)` as the first line inside `create_order`, run the tests, and look under the check for "# printed output". Which list is `items` when nobody passes one in?
---
A default value like `items=[]` is created **once**, when Python reads the `def` line, not each time the function is called. So every order created without items gets the *same* list. The usual fix is to use `None` as the default and make a fresh list inside the function.
---
Change the line to `def create_order(customer, items=None):` and add `if items is None:` with `items = []` indented underneath, before the `return`.
