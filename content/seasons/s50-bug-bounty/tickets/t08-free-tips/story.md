**From:** Sam (Finance)
**Bounty:** BUG-508

Riders are missing tips. 😟 When a customer types `2,50` or `two` in the tip box, the
app quietly saves a $0 tip instead of asking them to fix it. The form shows an error
whenever `parse_tip` in `tips.py` raises a `ValueError`, but it never sees one.
