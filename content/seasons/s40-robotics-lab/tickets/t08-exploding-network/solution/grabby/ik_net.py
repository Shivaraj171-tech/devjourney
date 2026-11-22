"""Learned inverse kinematics: a tiny network that maps a box position to joint angles.

The camera reports box positions in CENTIMETRES (x_cm, y_cm). The network outputs
(shoulder, elbow) in RADIANS. We train it on examples worked out by grabby.ik, so
later it can answer in one quick forward pass.
"""
import math
import random

from grabby.ik import inverse
from grabby.mlp import forward, new_net, train_step

LEARNING_RATE = 0.1
HIDDEN_UNITS = 8
UPDATES = 2000


def prepare(x_cm, y_cm):
    """The network's inputs for a box at (x_cm, y_cm): metres, so they are about 0 to 2."""
    return [x_cm / 100, y_cm / 100]


def make_examples(count, seed):
    """(x_cm, y_cm, [shoulder_rad, elbow_rad]) for boxes in front of Grabby (elbow "down")."""
    rng = random.Random(seed)
    examples = []
    for _ in range(count):
        distance = rng.uniform(0.7, 1.6)
        direction = math.radians(rng.uniform(15, 75))
        x, y = distance * math.cos(direction), distance * math.sin(direction)
        shoulder, elbow = inverse(x, y, "down")
        examples.append((x * 100, y * 100, [math.radians(shoulder), math.radians(elbow)]))
    return examples


def train_ik_net(examples, seed=0):
    """Train on random examples, one at a time. Returns (net, losses): losses is the
    average loss of every 100 updates (the learning curve)."""
    rng = random.Random(seed)
    net = new_net(2, HIDDEN_UNITS, 2, seed)
    losses, total = [], 0.0
    for update in range(1, UPDATES + 1):
        x_cm, y_cm, angles = examples[rng.randrange(len(examples))]
        total += train_step(net, prepare(x_cm, y_cm), angles, LEARNING_RATE)
        if update % 100 == 0:
            losses.append(total / 100)
            total = 0.0
    return net, losses


def predict_angles(net, x_cm, y_cm):
    """(shoulder_deg, elbow_deg) the network suggests for a box at (x_cm, y_cm)."""
    _, (shoulder, elbow) = forward(net, prepare(x_cm, y_cm))
    return math.degrees(shoulder), math.degrees(elbow)
