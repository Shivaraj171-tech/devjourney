**Strings**

A *string* is a piece of text, like a name or a message. You write one by putting text inside quotes: `"Hello"`.

Think of a fill-in-the-blank birthday card: "Happy birthday, ____!" You want the blank filled with a real name. In Python, an **f-string** does that. Put the letter `f` right before the opening quote, and anything inside curly braces `{ }` gets replaced by the value of that variable.

```python
city = "Lisbon"
plain = "We deliver in {city}"
filled = f"We deliver in {city}"
print(plain)   # We deliver in {city}
print(filled)  # We deliver in Lisbon
```

Both lines look almost the same, but only the second one has the `f`, so only the second one fills in the blank.

**Watch out:** Python won't warn you if you forget the `f`. The curly braces just show up as normal characters, so the mistake is easy to miss until a customer sees it.
