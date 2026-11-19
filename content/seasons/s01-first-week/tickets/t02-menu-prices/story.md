**From:** Leo (Customer Support)
**Ticket:** BUG-102: Menu shows prices 10× too high

Hi! A customer just asked why our margherita costs **$125.00**. It should be $12.50. 😬
Every price on the menu seems to be off by the same amount, and people are leaving the app before ordering.
Maya says prices are stored in **cents** (so 1250 means $12.50) and turned into labels by `format_price` in `app/menu.py`.
Can you find out why the conversion is wrong and fix it?
