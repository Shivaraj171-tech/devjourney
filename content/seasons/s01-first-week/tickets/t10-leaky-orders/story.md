**From:** Maya (Tech Lead)
**Ticket:** BUG-110: New orders contain other customers' food

Last ticket of your first week, and it's a strange one. 🕵️ Since we launched `create_order` in `app/orders.py`, some customers open a *brand-new* order and find other people's items already in it.
Remember the `add_item` you wrote on day two? It's working perfectly: it changes the list it's given. The real question is *which* list it's being given.
`items=[]` was Byte's autocomplete suggestion, accepted because it saved a line, and shortcuts like that tend to come back and bite you.
Fix it, and that's your first week done. You've fixed bugs, shipped features and read code nobody else understood. I'm really glad you're on the team. 🚀
