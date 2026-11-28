**From:** Ravi (Mobile Developer)
**Ticket:** REVIEW-304: Security review of the payments PR

From Monday the phone app takes real card payments. Byte has opened the server side, `app/payments.py`, and Maya wants a security review before anything touches real money.
My app runs on customers' phones. Anything it sends the server (card numbers, names, totals) can be changed by a curious customer with a laptop and an afternoon. The server has to treat all of it as *untrusted*.
Read the PR like an attacker. For every line ask: who can see this, and what happens if someone sends something they shouldn't?
Flag each line that's a real security problem. The masking and the receipt look fine to me. I've been wrong before (ask me about version 1.4).
