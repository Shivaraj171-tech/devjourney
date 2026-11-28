**From:** Priya (Marketing)
**Bounty:** BUG-502

`PIZZA5` is in this week's newsletter. If a customer types a code we don't have (say `PIZZA50` instead of `PIZZA5`), checkout crashes and they can't pay at all. Some of them will type it wrong. I would.
A wrong code should just give no discount. The price comes from `price_after_code` in `coupons.py`.
