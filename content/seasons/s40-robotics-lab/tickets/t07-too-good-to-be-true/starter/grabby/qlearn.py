"""Tabular Q-learning: Grabby learns which move is best in each grid cell by trying.

Q[state][action] is "how much reward do I expect if I make this move here, and play
well afterwards". After every move we nudge it towards what actually happened:

    target = reward + GAMMA * (best Q of the next state)      (just reward when done)
    Q[state][action] += ALPHA * (target - Q[state][action])

Usually Grabby picks the move with the highest Q; sometimes (EPSILON) a random one,
to keep exploring.
"""
import random

from grabby.reach_env import ACTIONS, START, step

ALPHA = 0.5  # how far each update moves Q
GAMMA = 0.95  # how much future reward counts
EPSILON = 0.2  # how often to try a random move
MAX_MOVES = 40  # an episode stops after this many moves anyway


def best_action(q_values):
    """Index of the highest value (the first one on a tie)."""
    best = 0
    for action in range(len(q_values)):
        if q_values[action] > q_values[best]:
            best = action
    return best


def train(seed, episodes=200):
    """Learn a Q-table. Returns (q, rewards): q maps state -> list of 4 values,
    rewards is the total reward of each episode (the learning curve)."""
    rng = random.Random(seed)
    q = {}
    rewards = []
    for _ in range(episodes):
        state = START
        total = 0.0
        for _ in range(MAX_MOVES):
            values = q.setdefault(state, [0.0] * len(ACTIONS))
            if rng.random() < EPSILON:
                action = rng.randrange(len(ACTIONS))
            else:
                action = best_action(values)
            next_state, reward, done = step(state, action)
            total += reward
            next_values = q.setdefault(next_state, [0.0] * len(ACTIONS))
            target = reward if done else reward + GAMMA * max(next_values)
            values[action] += ALPHA * (target - values[action])
            state = next_state
            if done:
                break
        rewards.append(total)
    return q, rewards


def greedy_path(q, max_moves=20):
    """The states Grabby visits when it always picks its best move (no exploring)."""
    state = START
    path = [state]
    for _ in range(max_moves):
        action = best_action(q.get(state, [0.0] * len(ACTIONS)))
        state, _, done = step(state, action)
        path.append(state)
        if done:
            break
    return path
