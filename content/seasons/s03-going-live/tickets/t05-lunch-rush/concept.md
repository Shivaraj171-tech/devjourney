**Performance: lists vs sets**

Code that's fast with 10 items can crawl with 10,000. `x in a_list` checks the items one by one, so it slows down as the list grows. Do that inside a loop over another big list and the work *multiplies*: twice the orders means four times the work.

A *set* is built for "is it in there?" questions: `x in a_set` is just as quick however big the set is. `set(a_list)` builds one in a single pass.

Think of finding a friend at a concert by checking every face, versus calling their name and having them wave back.

```python
sent = [1001, 1002, 1003]
sent_set = set(sent)          # one pass over the list
print(1002 in sent_set)       # True
print(1004 in sent_set)       # False
```

Sets have no order and no duplicates, so use them for checking and keep the list when order matters.

**Watch out:** Build the set once, *before* the loop. `x in set(big_list)` inside the loop rebuilds it every time and is just as slow as before.
