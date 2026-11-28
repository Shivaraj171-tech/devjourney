**From:** Leo (Customer Support)
**Ticket:** BUG-501: "I tipped 15% and the app says $0.00"

Riders say their tips have shrunk since Byte's new tip box went live. Customers who type "15%" just see "Tip: $0.00" and no reason why. Nine emails about it this week, two of them from riders.
Byte, in the chat: "My `tip_line` can never crash, I wrapped everything in `try/except Exception`." Maya, in the chat: "That's the problem. It can't crash, so it can't tell us anything either."
Please fix `tip_line` in `app/tip_box.py`. When the customer types something that isn't a whole number, show them the friendly message from the docstring. Let any other error crash, so it reaches our logs.
