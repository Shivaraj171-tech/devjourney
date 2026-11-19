**From:** Maya (Tech Lead)
**Ticket:** FEAT-301: An `Order` class for going live

Welcome to month one: we go live with real customers in four weeks! 🚀 Right now an order is a loose dictionary, every screen redoes its own maths, and a typo like `order["itmes"]` only shows up when a customer hits it.
So I've started a proper `Order` class in `app/order.py`, which keeps an order's data (id, customer, items, status) together with the things you can do with an order.
`__init__` and `add_item` are done. Please finish `item_count`, `subtotal` and `label`, so the kitchen screen can show lines like `Order 1001 for Sam: $17.00`.
Every method receives `self`, the order it was called on, so that's where you'll find the data.
