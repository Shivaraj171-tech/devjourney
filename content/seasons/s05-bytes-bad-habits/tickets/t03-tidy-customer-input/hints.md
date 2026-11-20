Go helper by helper. For each one, take the example in its docstring and work out, step by step, what the code really returns. Write the intermediate strings down.
---
Two kinds of problem hide in this PR. One is a method called with an option that doesn't exist (the import is fine, the call isn't). The other is a slice that is valid Python but takes the wrong piece of the string.
---
There are two lines to flag. For the first: `str.split` accepts only `sep` and `maxsplit`, so which call passes it something else? For the second, three helpers slice a string: work out `[:17]`, `[3:]` and `[:-4]` on their docstring examples, and flag the one whose result doesn't match.
