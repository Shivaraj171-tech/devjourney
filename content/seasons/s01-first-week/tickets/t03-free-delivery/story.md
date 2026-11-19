**From:** Priya (Marketing)
**Ticket:** BUG-103: "Free delivery over $25" isn't free at exactly $25

Our big campaign promises **free delivery on orders of $25 or more**.
A customer ordered exactly $25.00 of food and was still charged the $3.99 delivery fee. They posted the receipt online and tagged us.
The rule lives in `delivery_fee` in `app/delivery.py` (amounts are in cents, like the menu).
Please make the code match what the campaign promises before more people notice!
