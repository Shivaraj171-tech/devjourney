**From:** Maya (Tech Lead)
**Bounty:** BUG-507

The staffing dashboard says our busiest hour yesterday was **60**. 🕐 There is no
hour 60. It should be 18 (95 orders between 6 and 7pm). The answer comes from
`busiest_hour` in `rush.py`, which gets a list of `(hour, orders)` pairs.
