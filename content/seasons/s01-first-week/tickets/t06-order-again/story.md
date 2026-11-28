**From:** Ravi (Mobile Developer)
**Ticket:** BUG-106: "Order again" crashes for some customers

Ravi, I build the phone app. Since this morning **Order again** crashes for some people with `KeyError: 'garlic_bread'`. It's the button our regulars use most.
The kitchen took garlic bread off the menu yesterday. Anyone whose last order had it in can't reorder *anything* now (the app just shows the error).
The code is `reorder` in `app/reorder.py`. It looks up each old item in the menu dictionary to get today's price.
Its docstring (the description in triple quotes right under `def`) already says removed items should be skipped. Please make the code do what the docstring says.
