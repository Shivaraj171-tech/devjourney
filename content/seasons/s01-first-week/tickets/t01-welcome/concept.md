**Strings**

First, two words you'll see everywhere. A *variable* is a name that holds a value, like `city = "Lisbon"`. A *function* is the box the code lives in: `def greet(name):` makes a function called `greet`, and calling `greet("Sam")` runs it with `name` set to `"Sam"`. Inside, `return` hands the answer back to whoever called it.

Today's new idea: a *string* is a piece of text, like a name or a message. You write one by putting text inside quotes: `"Hello"`.

Think of a fill-in-the-blank birthday card: "Happy birthday, ____!" In Python, an **f-string** fills the blank. Put the letter `f` right before the opening quote, and anything inside curly braces `{ }` is replaced by the value of that variable.

```python
city = "Lisbon"
plain = "We deliver in {city}"
filled = f"We deliver in {city}"
print(plain)   # We deliver in {city}
print(filled)  # We deliver in Lisbon
```

Only the second line has the `f`, so only it fills in the blank.

**Watch out:** Python won't warn you if you forget the `f`. The curly braces just show up as normal characters, so the mistake is easy to miss until a customer sees it.

**AI check:** when an AI writes a string with `{ }` in it, check the `f` is there, then run it once with a real value.
