Read the traceback's last line again: it isn't about a number at all, it's about unpacking. Line 25 tries to split each thing `top_dishes` returns into `dish, count`. So what does `top_dishes` return right now? Try `sorted({"tea": 2, "soup": 5})` in your head.
---
`sorted(counts, ...)` only sorts the dictionary's keys, so you get plain names, not pairs. Sort `counts.items()` instead: that gives `(dish, count)` tuples. Then you need a key function that says how to order two pairs: biggest count first, and A-Z on a tie.
---
Two pieces. `top_dishes` sorts `counts.items()` (not `counts`) with a `key=` function, then keeps the first `n`. That key function takes one `(dish, count)` pair and returns a tuple: its first item makes big counts come first (what does negating a number do to the order?), and its second item breaks ties A-Z.
