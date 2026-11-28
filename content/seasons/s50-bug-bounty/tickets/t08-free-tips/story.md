**From:** Kavya (Finance)
**Bounty:** BUG-508

Riders are missing tips. When a customer types `2,50` or `two` in the tip box, the app saves a $0 tip instead of asking them to fix it. The customer meant to pay it, and the rider never gets it.
The form shows an error whenever `parse_tip` in `tips.py` raises a `ValueError`. It never sees one.
