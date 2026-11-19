**Security basics**

Security bugs aren't crashes: the code "works", but someone can misuse it. Three habits catch most beginner mistakes:

1. **Don't trust input.** Anything a user, app or browser sends can be changed. The server works out prices and permissions itself.
2. **Keep secrets out of logs.** Card numbers and passwords never go into logs, error messages or receipts.
3. **Never glue user input into commands.** A query built from text can be hijacked (*SQL injection*).

Think of a shop till: the cashier scans the price tag, they don't ask the customer what the price is.

```python
def card_for_logs(card_number):
    return "**** " + card_number[-4:]

print(card_for_logs("4242424242424242"))  # **** 4242

name = "x' OR '1'='1"
print(f"WHERE customer = '{name}'")  # WHERE customer = 'x' OR '1'='1'
```

That last line now matches *every* customer, not just one.

**Watch out:** "The app already checks it" is not security. Anyone can skip your app and send requests to the server directly.
