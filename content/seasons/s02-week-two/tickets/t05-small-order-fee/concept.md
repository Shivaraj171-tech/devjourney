**Reviewing diffs**

When a pull request changes existing files, you usually see a *diff*: only the lines that changed, with a little context around them. Lines starting with **+** were added, lines with **-** were removed, and lines with a space didn't change.

It's like "track changes" in a shared document: you don't reread the whole report, you check each crossed-out and inserted bit, and ask whether it belongs there.

```
 def checkout_total(cart):
     total = cart_subtotal(cart)
-    total = total + delivery_fee(total)
     return total
```

A single **-** line, and suddenly nobody pays for delivery. The code still runs and looks tidy, which is exactly why it's easy to wave through.

For each **+** or **-** line, ask: is this part of what the description says the PR does? If yes, is it correct? If not, why is it here?

**Watch out:** The riskiest lines are often the small "while I was in there" changes next to the main feature. Nobody is looking for bugs there, so give them as much attention as the new code.
