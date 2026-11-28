**From:** Maya (Tech Lead)
**Ticket:** REVIEW-201: Review Byte's tipping PR

Week two. As of this morning Byte is a full AI pair programmer, not just autocomplete, and it has already opened its first pull request: tips for our delivery riders. (A *PR* is a proposed change to the code. It gets *merged* into the real app once someone approves it.)
Byte writes code in seconds. It doesn't always check that the code does what the docstrings promise. That's your job now. Nothing merges without a human review.
Read `app/tips.py` line by line, and run a real order through it in your head. Try a $20.00 cart with a 15% tip.
Flag every line that has a real bug. Only those: flagging lines that are fine wastes Byte's time and costs you a bit of XP.
