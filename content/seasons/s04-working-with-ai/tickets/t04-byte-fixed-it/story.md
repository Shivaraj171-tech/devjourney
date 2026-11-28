**From:** Leo (Customer Support)
**Ticket:** BUG-404: "Sorry Mckenzie!"

Timeline, for the record. After your review, Byte rewrote the apology text with the real `late_refund`, and Maya merged it with a few tests. Then I reported that customers who type their name in lowercase got "Sorry sam!". Byte fixed that in one line and told everyone.
Now Ms McKenzie has written in. Her words: "It is McKenzie. Capital K. It has been McKenzie for 300 years." Our two-part names are getting squashed too.
Byte's fix made the "sam" test pass, and it never ran the tests we already had. Please fix `display_name` in `app/apology.py` so the new test AND all the old ones pass.
