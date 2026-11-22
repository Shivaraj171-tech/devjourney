**Logistic regression (and data leaks)**

A classifier answers yes/no questions from numbers, like "will this grasp work?". Logistic regression gives each **feature** a weight, adds them up, and squashes the sum into a probability between 0 and 1. Training nudges the weights to make the training answers more likely.

The only score that matters is on data the model has never seen, measured the way it will be used:

```python
def accuracy(guesses, truth):
    right = 0
    for g, t in zip(guesses, truth):
        right += g == t
    return right / len(truth)

print(accuracy([1, 1, 0, 1], [1, 0, 0, 1]))  # 0.75
```

A **data leak** is a feature that secretly contains the answer. Grabby's slip sensor fires *during* the lift, when the box is already falling. Of course it predicts failure perfectly: it IS the failure. Like a weather forecast that "predicts" yesterday's rain by looking out of the window.

**Watch out:** a leak looks like a brilliant model. Held-out rows from the same logbook have the leak too, so they score 97% as well. Only data shaped like real use (before the grasp, no slip reading) shows the truth.

**AI check:** when an AI reports a suspiciously high accuracy, ask for every feature: "would I have this number at the moment I need the prediction?"
