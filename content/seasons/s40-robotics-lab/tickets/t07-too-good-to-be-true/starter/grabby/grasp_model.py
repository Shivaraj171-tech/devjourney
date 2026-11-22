"""Will this grasp work? A logistic regression classifier, from scratch.

The model gives each feature a weight, adds them up (plus a bias) and squashes the
sum into a probability between 0 and 1 with the sigmoid. Training nudges the weights
downhill on the log loss, over and over (gradient descent).

Features are rescaled first (minus the mean, divided by the spread), so a feature
measured in big numbers doesn't drown out the others.
"""
import math

# What the model looks at. Byte: "more features = more accuracy!"
FEATURES = ["width_cm", "force_n", "offset_deg", "slipped"]


def features(attempt):
    """The attempt's feature values, in FEATURES order (a missing reading counts as 0)."""
    values = []
    for name in FEATURES:
        value = attempt[name]
        values.append(0.0 if value is None else float(value))
    return values


def sigmoid(z):
    if z < -30:
        return 0.0
    return 1.0 / (1.0 + math.exp(-z))


def train(attempts, epochs=120, learning_rate=0.5):
    """Fit the model. Returns (model, losses): losses is the average log loss of each epoch."""
    rows = [features(a) for a in attempts]
    labels = [a["success"] for a in attempts]
    n, k = len(rows), len(FEATURES)
    mean = [sum(r[j] for r in rows) / n for j in range(k)]
    spread = [(sum((r[j] - mean[j]) ** 2 for r in rows) / n) ** 0.5 or 1.0 for j in range(k)]
    scaled = [[(r[j] - mean[j]) / spread[j] for j in range(k)] for r in rows]
    weights, bias = [0.0] * k, 0.0
    losses = []
    for _ in range(epochs):
        grad_w, grad_b, loss = [0.0] * k, 0.0, 0.0
        for x, label in zip(scaled, labels):
            p = sigmoid(sum(w * v for w, v in zip(weights, x)) + bias)
            loss -= math.log(p + 1e-12) if label else math.log(1 - p + 1e-12)
            for j in range(k):
                grad_w[j] += (p - label) * x[j]
            grad_b += p - label
        weights = [w - learning_rate * g / n for w, g in zip(weights, grad_w)]
        bias -= learning_rate * grad_b / n
        losses.append(loss / n)
    model = {"weights": weights, "bias": bias, "mean": mean, "spread": spread, "features": list(FEATURES)}
    return model, losses


def probability(model, attempt):
    """How likely this grasp is to work, from 0 to 1."""
    x = features(attempt)
    z = model["bias"]
    for w, v, m, s in zip(model["weights"], x, model["mean"], model["spread"]):
        z += w * (v - m) / s
    return sigmoid(z)


def accuracy(model, attempts):
    """The share of attempts the model gets right (guessing success when probability >= 0.5)."""
    right = 0
    for a in attempts:
        guess = 1 if probability(model, a) >= 0.5 else 0
        right += guess == a["success"]
    return right / len(attempts)
