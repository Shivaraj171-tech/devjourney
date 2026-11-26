Look at the failing check: Ana's brand-new order already has Sam's item in it. To see it happen, add `print(customer, items)` as the first line inside `create_order`, run the tests, and look under the check for "# printed output". Which list is `items` when nobody passes one in?
---
A default value like `items=[]` is created **once**, when Python reads the `def` line, not each time the function is called. So every order created without items gets the *same* list. The usual fix is to use `None` as the default and make a fresh list inside the function.
---
Two changes in `create_order`. On the `def` line, make the default `None` instead of `[]`. Then, as the first thing inside the function, check whether `items` is `None` and, if it is, give it a brand-new empty list, before the `return`.
