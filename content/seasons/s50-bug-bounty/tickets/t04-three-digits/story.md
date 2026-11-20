**From:** Sam (Finance)
**Bounty:** BUG-504

Customers are emailing us because their receipt says "card ending ***444" when their
card ends in 4444. 💳 It should hide every digit except the last four. The masking is
done by `mask_card` in `receipts.py`.
