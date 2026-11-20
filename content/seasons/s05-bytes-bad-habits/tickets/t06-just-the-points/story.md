**From:** Priya (Marketing)
**Ticket:** FEAT-506: "You earned 22 points!" on the confirmation screen

I asked Byte for ONE line on the confirmation screen: how many loyalty points the order earned, using the points we already give. Byte's draft in `app/loyalty.py` does that... plus double points at weekends, a 50-point welcome bonus and a "WOW!" for big orders. 🙈
None of that was agreed, and the welcome bonus alone would hand out points we never promised. Maya's verdict: "Small, reviewable changes. Ship what was asked; extras get their own ticket."
Please make `points_message` do exactly what my request in the file says, and nothing more. Byte has offered a trimmed version too, if you can check it.
