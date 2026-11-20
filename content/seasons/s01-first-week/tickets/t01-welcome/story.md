**From:** Maya (Tech Lead)
**Ticket:** BUG-101: Home screen greets everyone as "{name}"

Hey, welcome to the team! 👋 Your first ticket is a small one, but customers see it straight away.
Since yesterday's release, the home screen says *"Welcome back to Orbit Orders, {name}!"*, curly braces and all, instead of the customer's actual name. The line came from Byte, the office robot that helps with our autocomplete, and someone accepted its suggestion without trying it first. 🤖 Support already has three screenshots of it.
The code is in `app/greeting.py`. Make `greet("Sam")` return `"Welcome back to Orbit Orders, Sam!"` and get the tests passing.
