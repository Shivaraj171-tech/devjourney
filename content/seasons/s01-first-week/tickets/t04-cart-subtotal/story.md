**From:** Leo (Customer Support)
**Ticket:** BUG-104: Cart total leaves out the last item

Me again! A customer ordered a margherita, garlic bread and a lemonade, and the cart total said **$17.00** instead of **$19.99**: the lemonade was free. 🍋
I tried a few more orders and it's always the *last* thing added that goes missing, so we're losing money on every single order.
The total comes from `cart_subtotal` in the new file `app/cart.py`, where a cart is just a list of prices in cents, like `[1250, 450, 299]`.
Maya says Byte's autocomplete wrote that function, and it looked so normal that nobody ran it on a real cart. Can you find out where the last price gets lost?
