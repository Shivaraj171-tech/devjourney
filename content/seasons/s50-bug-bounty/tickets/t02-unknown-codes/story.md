**From:** Priya (Product)
**Bounty:** BUG-502

If a customer types a coupon code we don't have (say `PIZZA50` instead of `PIZZA5`),
checkout crashes and they can't pay at all. 😬 A wrong code should just give no
discount. The price comes from `price_after_code` in `coupons.py`.
