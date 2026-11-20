**From:** Maya (Tech Lead)
**Ticket:** FEAT-405: Leo's end-of-day refund report

Leo wants one report at closing time with every late order and the total we refunded. My first prompt to Byte was "write a refund report", and it came back with a CSV exporter for a database we don't have. 🙃
So I tried again with context: the real function names, the exact line format, Leo's rules and an example. That time Byte wrote a solid `refund_line` in `app/refund_report.py`, and left `refund_report` for us.
Please finish `refund_report` from the spec in its docstring. And remember the rule of the month: **AI writes code, you own it.** If it ships with our name on it, we understand it and we've tested it.
