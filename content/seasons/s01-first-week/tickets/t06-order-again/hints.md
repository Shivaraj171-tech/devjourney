Look at the error message: `KeyError: 'garlic_bread'`. Which line asks the menu dictionary for a key, and what happens when that key isn't there?
---
`menu[name]` crashes if `name` isn't a key in the dictionary. You can check first with `name in menu`, which is `True` or `False`.
---
Wrap the append in an `if`: `if name in menu:` and then, indented underneath, `cart.append(menu[name])`.
