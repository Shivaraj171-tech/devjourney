**From:** Ravi (Mobile Developer)
**Ticket:** REVIEW-304: Security review of the payments PR

Big week: from Monday, the phone app takes real card payments! 💳 Byte has opened the server side, `app/payments.py`, and Maya wants a security review before anything touches real money.
Here's the thing about my app: it runs on customers' phones, so the server must treat everything it sends (card numbers, names, totals) as *untrusted*, because a curious customer can change any of it.
Read the PR like an attacker, asking of every line: who can see this, and what happens if someone sends something sneaky?
Flag each line that's a real security problem. The masking and the receipt look fine to me, but don't take my word for it.
