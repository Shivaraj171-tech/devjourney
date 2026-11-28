**From:** Leo (Customer Support)
**Ticket:** BUG-102: Menu shows prices 10× too high

New email, word for word: "why is ur margherita $125 lol". It should be $12.50.
Every price on the menu is off by the same amount, and people are closing the app before they order.
Maya says prices are stored in **cents** (1250 means $12.50) and turned into labels by `format_price` in `app/menu.py`. That line was one of Byte's autocomplete suggestions, accepted in a hurry before lunch.
Can you find out why the conversion is wrong and fix it? I'd like to reply to her with something better than "lol".
