**From:** Maya (Tech Lead)
**Ticket:** FEAT-405: Leo's end-of-day refund report

Leo wants one report at closing time: every late order and the total we refunded. My first prompt to Byte was "write a refund report". It came back with a CSV exporter for a database we don't have.
Second try, with context: the real function names, the exact line format, Leo's rules and an example. That time Byte wrote a solid `refund_line` in `app/refund_report.py` and left `refund_report` for us.
Finish `refund_report` from the spec in its docstring.
Rule for the month: **AI writes code, you own it.** If it ships with our name on it, we understand it and we've tested it.
