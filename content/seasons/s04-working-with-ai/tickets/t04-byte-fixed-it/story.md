**From:** Leo (Customer Support)
**Ticket:** BUG-404: "Sorry Mckenzie!"

After your review, Byte rewrote the apology text with the real `late_refund`, and Maya merged it with a few tests. Then I reported that customers who type their name in lowercase got "Sorry sam!", and Byte fixed that in one line, very proud of itself. 🤖
Now Ms McKenzie has written in, a little upset that we call her "Mckenzie", and our two-part names are getting squashed too.
Byte's fix made the "sam" test pass, and it never ran the tests we already had: please fix `display_name` in `app/apology.py` so the new test AND all the old ones pass.
