**From:** Ravi (Mobile Developer)
**Ticket:** BUG-106: "Order again" crashes for some customers

Hey, Ravi here, I build the phone app. Our **Order again** button is a regular's favourite, but since this morning it crashes for some people with `KeyError: 'garlic_bread'`.
Turns out the kitchen took garlic bread off the menu yesterday, and anyone whose last order included it now can't reorder *anything*.
The code is `reorder` in `app/reorder.py`: it looks up each old item in the menu dictionary to get today's price.
Its docstring already says removed items should be skipped, so please make the code do what it promises.
