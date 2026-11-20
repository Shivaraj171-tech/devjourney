**From:** Maya (Tech Lead)
**Ticket:** BUG-504: The vegan filter shows "pizza, sides, drinks"

Byte built `app/menu_board.py` for the new menu screen: the whole menu as a dictionary of categories, each holding a list of dishes. My test in `team_tests/test_menu_board.py` went red on it, and the preview's "Vegan dishes" list reads "pizza, sides, drinks". 🥗
Byte already has a fix ready: "CI green in one line ✅". Before you accept it, look at WHICH file its diff changes.
Please fix `vegan_dishes` so my test passes as I wrote it. CI also checks that my test can still catch Byte's bug, so a test edited to agree with the code won't get through.
