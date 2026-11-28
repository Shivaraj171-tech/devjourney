**From:** Maya (Tech Lead)
**Ticket:** BUG-110: New orders contain other customers' food

Last ticket of the week. A strange one.
Since we launched `create_order` in `app/orders.py`, some customers open a *brand-new* order and find someone else's items already in it.
Remember the `add_item` you wrote on day two? It works. It changes the list it's given. The question is *which* list it's being given.
`items=[]` was Byte's autocomplete suggestion. Someone accepted it because it saved a line.
Fix it and that's week one: seven bugs counting this one, two features, and a module nobody else had read. See you Monday.
