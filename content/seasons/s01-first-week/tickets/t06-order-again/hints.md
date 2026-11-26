Look at the error message: `KeyError: 'garlic_bread'`. Which line asks the menu dictionary for a key, and what happens when that key isn't there?
---
`menu[name]` crashes if `name` isn't a key in the dictionary. You can check first with `name in menu`, which is `True` or `False`.
---
Put the append line inside an `if` that checks whether `name` is one of the menu's keys (the `in` test from the last hint), and indent the append under it, so it only runs for dishes the menu has.
