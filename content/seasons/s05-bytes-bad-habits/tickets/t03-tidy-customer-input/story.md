**From:** Maya (Tech Lead)
**Ticket:** REVIEW-503: Review Byte's customer-input helpers

Customers type messy things: "  orbit20 ", "Nuts, dairy ,  GLUTEN", phone numbers with or without +1. Byte has opened a PR with six small helpers to tidy them up. Its words: "the module imports cleanly, so it all works".
Importing proves the file has no syntax errors. That's all. Python checks a method's arguments when that line *runs*, and a slice can be valid Python and still cut the wrong end.
Read each helper against its docstring. Trace the examples in your head. Flag only the lines that would do the wrong thing (or crash) for a real customer.
