There are three problems, one in each of three different functions. For each function, ask: does a secret end up somewhere lots of people can read it? Does the server believe something the phone sent? Does text typed by a customer become part of a command?
---
Compare `payment_log_line` with `receipt_line`: one hides the card number, one doesn't. In `build_charge`, read the docstring, then look where `amount` really comes from (and notice `delivery_fee` is imported but never used). In `order_history_query`, imagine a customer whose name contains a `'`.
---
Flag line 19 (the full card number is logged), line 27 (the amount is the app's total instead of the order's own subtotal plus delivery) and line 42 (the customer's name is glued into the SQL query). `mask_card` and `receipt_line` are fine.
