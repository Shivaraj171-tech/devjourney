**From:** Kavya (Finance)
**Bounty:** BUG-504

Customers are emailing because their receipt says "card ending ***444" when their card ends in 4444. Two of them asked whether we charged a different card.
A receipt should hide every digit except the last four. The masking is done by `mask_card` in `receipts.py`.
