**Tiny neural networks (MLP)**

A neural network is a stack of weighted sums. Each hidden unit adds up `weight * input` for every input, squashes the total with `tanh` (into -1 to 1), and the outputs are weighted sums of those. Training shows it one example at a time and nudges every weight a little against its share of the error: **gradient descent**. The **learning rate** is the size of that nudge.

Like adjusting a shower: small turns, check, turn again. Turn too far each time and you swing between freezing and scalding, further every time.

Two things keep it stable:
1. **Input scale.** `tanh` flattens out for big inputs, and every weight's nudge is multiplied by its input:

```python
import math
print(round(math.tanh(0.5), 3), round(math.tanh(1.5), 3))      # 0.462 0.905
print(round(math.tanh(50.0), 3), round(math.tanh(150.0), 3))   # 1.0 1.0
```

Inputs in centimetres (around 100) push every hidden unit to exactly 1 or -1, where it can't tell boxes apart. Scale inputs to around -1..2 first.
2. **Learning rate.** Too big and each step overshoots by more than the last: the loss grows until it's infinite, then `nan`.

An exploding loss isn't a crash. Python carries on with `inf` and `nan`, and the network just outputs nonsense.

**Ranges and the loss curve.** Before trusting an AI's training setup, look at the input ranges and plot the loss curve. It should fall, not climb.
