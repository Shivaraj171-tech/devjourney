**From:** Leo (Customer Support)
**Ticket:** BUG-104: Cart total leaves out the last item

Me again. A customer ordered a margherita, garlic bread and a lemonade. The cart said **$17.00**. It should say **$19.99**. The lemonade was free.
I tried four more orders. It's always the *last* thing added that goes missing, so we lose money on every single order.
The total comes from `cart_subtotal` in the new file `app/cart.py`. A cart is just a list of prices in cents, like `[1250, 450, 299]`.
Maya says Byte's autocomplete wrote that function, and it looked so normal that nobody ran it on a real cart. Can you find where the last price goes?
