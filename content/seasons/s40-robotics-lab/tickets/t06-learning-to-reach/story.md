**From:** Rosa (Robotics Engineer)
**Ticket:** LAB-106: Grabby hovers next to the box forever

An experiment. Instead of solving the angles with maths, Grabby learns to reach a box on a high shelf by trial and error: Q-learning, in `grabby/qlearn.py`. It only knows what `step()` in `grabby/reach_env.py` tells it: where it ended up, the reward, and whether the episode is over.
Byte wrote the rewards "to make it learn faster". After training, Grabby moves near the box and wiggles around it until time runs out. It never grabs it.
Fix `step()` so that reaching the box is what pays. The Lab viewer shows the learned values as a grid with Grabby's path, the reward per episode, and the arm playing its best moves.
