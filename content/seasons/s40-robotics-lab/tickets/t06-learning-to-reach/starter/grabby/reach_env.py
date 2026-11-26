"""A practice world for teaching Grabby to reach by trial and error (reinforcement learning).

The joints only stop at a few angles, so a state is a grid cell:
  state = (shoulder_index, elbow_index) into SHOULDER_STOPS and ELBOW_STOPS.
Each action nudges one joint one stop. step() says what happened: the next state,
a reward (the "score" for that move) and done (True when the episode is over).
The learner (grabby/qlearn.py) only ever sees those three things.
"""
import math

from grabby.arm import forward

SHOULDER_STOPS = [0, 30, 60, 90, 120, 150, 180]  # degrees
ELBOW_STOPS = [-120, -90, -60, -30, 0, 30, 60, 90, 120]  # degrees
ACTIONS = ["shoulder +30", "shoulder -30", "elbow +30", "elbow -30"]
MOVES = [(1, 0), (-1, 0), (0, 1), (0, -1)]

START = (0, 4)  # shoulder 0 degrees, elbow 0 degrees: the arm straight out
TARGET = (-0.6, 1.2)  # the box, in metres
GOAL_DISTANCE = 0.25  # the gripper is "at the box" closer than this
NEAR_DISTANCE = 0.7


def gripper(state):
    """Where the gripper is in this state, as (x, y)."""
    return forward(SHOULDER_STOPS[state[0]], ELBOW_STOPS[state[1]])


def distance_to_box(state):
    x, y = gripper(state)
    return math.hypot(x - TARGET[0], y - TARGET[1])


def move(state, action):
    """The state after one action (a joint at its last stop stays there)."""
    shoulder = min(max(state[0] + MOVES[action][0], 0), len(SHOULDER_STOPS) - 1)
    elbow = min(max(state[1] + MOVES[action][1], 0), len(ELBOW_STOPS) - 1)
    return (shoulder, elbow)


def step(state, action):
    """One move: (next_state, reward, done)."""
    next_state = move(state, action)
    if distance_to_box(next_state) < NEAR_DISTANCE:
        return next_state, 1.0, False
    return next_state, 0.0, False
