**Q-learning (reinforcement learning)**

Reinforcement learning is training by score, like a dog learning tricks for treats: the learner tries moves, gets a **reward** after each one, and slowly prefers moves that lead to more reward in total.

Q-learning keeps a table: `Q[state][action]` = "how much reward I expect if I do this here and play well after". After each move it nudges that guess towards what happened:

```python
alpha, gamma = 0.5, 0.9
q_here, reward, best_next = 0.0, -1.0, 10.0
q_here += alpha * (reward + gamma * best_next - q_here)
print(q_here)  # 4.0
```

The learner maximises the **total** reward of an episode, so the rewards define the goal. `done = True` ends the episode: nothing more to collect after it.

The learner finds the easiest way to score, not the one you meant. Pay +1 for every move spent *near* the box and it learns to stay near forever (40 moves × 1 beats grabbing it once). Reward the result (reaching the box ends the episode with a bonus) and make every other move cost a little, so faster is better.

**The laziest way to score.** For every reward an AI designs, ask: "what is the laziest behaviour that scores best?" If it isn't the behaviour you want, the reward is wrong, however good the learning code is.
