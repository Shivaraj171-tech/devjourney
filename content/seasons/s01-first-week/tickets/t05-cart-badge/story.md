**From:** Sofia (Product Designer)
**Ticket:** FEAT-105: "Add to cart" button and cart badge

I'm Sofia. I design the app screens. The new menu screen has an **Add to cart** button and a small badge on the cart icon that shows how many items are inside.
Right now the button does nothing and the badge stays blank. In testing, people tapped **Add** five times, stared at the badge, and gave up.
The two functions are stubbed out in `app/cart_actions.py`: `add_item` should put a price on the end of the cart list, and `item_count` should say how many items are in it.
Could you fill them in so the tests pass? I'm showing this screen at Friday's demo, and I'd rather not tap **Add** five times in front of everyone.
