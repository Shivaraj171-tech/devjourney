**From:** Maya (Tech Lead)
**Ticket:** BUG-101: Home screen greets everyone as "{name}"

Welcome. First ticket's small, but every customer sees it the second they open the app.
Since yesterday's release the home screen says *"Welcome back to Orbit Orders, {name}!"*, curly braces and all, instead of the customer's name. The line came from Byte, the office robot that does our autocomplete. Someone accepted its suggestion without trying it. Support has three screenshots already.
The code is in `app/greeting.py`. Make `greet("Sam")` return `"Welcome back to Orbit Orders, Sam!"` and get the tests passing.
