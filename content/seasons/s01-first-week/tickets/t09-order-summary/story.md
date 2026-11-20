**From:** Sofia (Product Designer)
**Ticket:** FEAT-109: Order summary on the checkout screen

The checkout screen is designed and ready, and it needs the summary box: subtotal, discount, delivery and the final total. ✨
Right now it shows `$0.00` on every line, which isn't exactly confidence-inspiring when you're about to pay.
The good news: you've already fixed or read every piece we need this week (`cart_subtotal`, `discount_amount`, `delivery_fee` and `format_price`).
Please finish `order_summary` in `app/summary.py` so it calls those helpers instead of using zeros. The docstring has a worked example. Byte's autocomplete will happily guess the maths for you, but this is people's money, so check its guesses against that example.
