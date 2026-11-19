**JSON**

*JSON* is a plain-text format for saving data or sending it to another program. Python's `json` module turns dictionaries, lists, strings, numbers, `True`/`False` and `None` into text with `json.dumps`, and turns that text back into Python values with `json.loads`.

Think of moving house: you pack your things into labelled boxes, and unpack them in the new place. Most things arrive exactly as packed, but some only fit in the box in a different shape, and you have to put them back together.

```python
import json

text = json.dumps({"lemonade": 299, 7: "table"})
print(text)               # {"lemonade": 299, "7": "table"}
back = json.loads(text)
print(back["lemonade"])   # 299
print(list(back))         # ['lemonade', '7']
```

Values like `299` survive the trip as numbers, but the key `7` came back as the text `"7"`.

**Watch out:** In JSON, dictionary keys are always text. Number keys are quietly turned into strings when you save, so convert them back (for example with `int()`) when you load.
