Look at the Lab viewer's "Reward per episode" chart: totals around 30 or more, though the box should be reachable in a few moves. Then read `step()`: what does Grabby get for a move that ends near the box? Does anything ever set `done` to True?
---
Each move near the box pays +1, and nothing ends the episode, so the best plan is to hang around near the box for all 40 moves. Reaching the box must be what pays, and it must END the episode (done=True), and every other move must cost a little so a short route beats a long one.
---
In `step()`, first check whether `next_state` is at the box (`distance_to_box(...) < GOAL_DISTANCE`): then return a big positive reward and `True`. Otherwise return a small negative reward and `False`. What's left to delete?
