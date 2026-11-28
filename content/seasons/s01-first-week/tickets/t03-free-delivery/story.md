**From:** Priya (Marketing)
**Ticket:** BUG-103: "Free delivery over $25" isn't free at exactly $25

The campaign on every poster says **free delivery on orders of $25 or more**.
A customer ordered exactly $25.00 of food and was still charged the $3.99 delivery fee. She posted the receipt online and tagged us. With our logo in the photo.
The rule lives in `delivery_fee` in `app/delivery.py` (amounts are in cents, like the menu).
Please make the code match the poster before the weekend orders start.
