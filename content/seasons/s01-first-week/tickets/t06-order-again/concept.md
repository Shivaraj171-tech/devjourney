**Dictionaries**

A *dictionary* stores pairs: a **key** and the **value** that goes with it. You write it with curly braces: `{"lemonade": 299}`. You look up a value by its key with square brackets.

It's like a real dictionary, or a phone's contact list: you look up a name (the key) to find the number (the value). If the name isn't in your contacts, there's simply nothing to find.

```python
stock = {"apples": 4, "pears": 0}
print(stock["apples"])          # 4
print("kiwis" in stock)         # False
print(stock.get("kiwis", 0))    # 0
print(stock["kiwis"])           # KeyError: 'kiwis'
```

`key in my_dict` checks whether a key exists. `.get(key, default)` gives back the default instead of failing when the key is missing.

**Watch out:** Square-bracket lookup on a missing key stops the whole program with a `KeyError`. When data can change over time (like a menu), don't assume every key you knew about yesterday is still there.
