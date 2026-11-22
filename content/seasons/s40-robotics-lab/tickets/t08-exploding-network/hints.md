Look at the loss chart in the Lab viewer: it starts huge and climbs to infinity. Two settings in `grabby/ik_net.py` decide how big each training step is: what goes into the network (`prepare`), and `LEARNING_RATE`. What size are the numbers coming out of `prepare` for a box at (120, 50)?
---
The network sees 120 and 50, so every hidden unit's `tanh` is pinned at 1 or -1, and each weight nudge is multiplied by those big inputs: with a learning rate of 0.5 that overshoots more every step. Lowering the rate alone stops the explosion, but the loss gets stuck around 0.18. Scaling the inputs alone isn't enough at 0.5 either.
---
Change two things. In `prepare`, give the network metres instead of centimetres (the docstring says what range to aim for). And make `LEARNING_RATE` smaller: try 0.1. Which division turns centimetres into metres?
