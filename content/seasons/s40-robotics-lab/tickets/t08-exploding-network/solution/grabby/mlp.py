"""A tiny neural network (a multilayer perceptron), from scratch.

inputs -> hidden layer (weighted sums squashed by tanh) -> outputs (weighted sums).
Training = for one example at a time: run it forward, measure the error, and move
every weight a little against its share of the error (backpropagation + gradient
descent). The learning rate says how big that little is.

A network is a dict of lists: w1[h][i] connects input i to hidden unit h,
w2[o][h] connects hidden unit h to output o, b1 and b2 are the biases.
"""
import math
import random


def new_net(n_inputs, n_hidden, n_outputs, seed=0):
    """Small random starting weights (the same ones every time for the same seed)."""
    rng = random.Random(seed)
    return {
        "w1": [[rng.gauss(0, 1 / math.sqrt(n_inputs)) for _ in range(n_inputs)] for _ in range(n_hidden)],
        "b1": [0.0] * n_hidden,
        "w2": [[rng.gauss(0, 1 / math.sqrt(n_hidden)) for _ in range(n_hidden)] for _ in range(n_outputs)],
        "b2": [0.0] * n_outputs,
    }


def forward(net, inputs):
    """(hidden, outputs) for one example."""
    hidden = [math.tanh(sum(w * x for w, x in zip(row, inputs)) + b) for row, b in zip(net["w1"], net["b1"])]
    outputs = [sum(w * h for w, h in zip(row, hidden)) + b for row, b in zip(net["w2"], net["b2"])]
    return hidden, outputs


def train_step(net, inputs, targets, learning_rate):
    """One gradient-descent step on one example. Returns its loss (mean squared error)."""
    hidden, outputs = forward(net, inputs)
    errors = [o - t for o, t in zip(outputs, targets)]
    loss = sum(e * e for e in errors) / len(errors)
    # How much each hidden unit is to blame (through w2, and through tanh's slope).
    blame = [sum(net["w2"][o][h] * errors[o] for o in range(len(errors))) * (1 - hidden[h] ** 2) for h in range(len(hidden))]
    for o, error in enumerate(errors):
        for h in range(len(hidden)):
            net["w2"][o][h] -= learning_rate * error * hidden[h]
        net["b2"][o] -= learning_rate * error
    for h, b in enumerate(blame):
        for i in range(len(inputs)):
            net["w1"][h][i] -= learning_rate * b * inputs[i]
        net["b1"][h] -= learning_rate * b
    return loss
