**From:** Priya (Marketing)
**Ticket:** FEAT-506: "You earned 22 points!" on the confirmation screen

I asked Byte for ONE line on the confirmation screen: how many loyalty points the order earned, using the points we already give. Byte's draft in `app/loyalty.py` does that. It also adds double points at weekends, a 50-point welcome bonus and a "WOW!" for big orders.
None of that was agreed. The welcome bonus alone would hand out points I never put in a campaign, and I'd be the one explaining it to Finance.
Maya's verdict: "Small, reviewable changes. Ship what was asked. Extras get their own ticket."
Please make `points_message` do exactly what my request in the file says, and nothing more. Byte has offered a trimmed version too, if you want to check it.
