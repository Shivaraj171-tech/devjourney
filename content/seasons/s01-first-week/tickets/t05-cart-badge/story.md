**From:** Sofia (Product Designer)
**Ticket:** FEAT-105: "Add to cart" button and cart badge

Hi, I'm Sofia, I design the app screens! 🎨 The new menu screen has an **Add to cart** button and a little badge on the cart icon showing how many items are inside.
Right now the button does nothing and the badge is always blank, so in testing people kept tapping "Add" five times and then gave up.
The two functions are already stubbed out in `app/cart_actions.py`: `add_item` should put a price on the end of the cart list, and `item_count` should say how many items are in it.
Could you fill them in so the tests pass? Then I can finally show this screen at Friday's demo.
