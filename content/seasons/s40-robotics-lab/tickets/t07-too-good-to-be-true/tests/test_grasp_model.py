from lab import viz

from grabby import grasp_model
from grabby.grasp_data import make_attempts

TRAIN = make_attempts(240, seed=1)  # last month's logbook
HELD_OUT = make_attempts(120, seed=2)  # logbook rows kept aside for testing
NEW_GRASPS = make_attempts(120, seed=3, before_grasp=True)  # tomorrow: no slip reading yet

_cache = {}


def model():
    """Train once, and draw it."""
    if "model" not in _cache:
        trained, losses = grasp_model.train(TRAIN)
        _cache["model"] = trained
        viz.chart("Training loss", list(range(1, len(losses) + 1)), losses, label="log loss", x_label="epoch", y_label="loss")
        points = [(a["width_cm"], a["force_n"]) for a in NEW_GRASPS]
        viz.points("New grasps: what really happened", points, labels=[a["success"] for a in NEW_GRASPS],
                   x_label="box width (cm)", y_label="grip force (N)", classes=("dropped", "in the bin"))
        guesses = [grasp_model.probability(trained, a) >= 0.5 for a in NEW_GRASPS]
        viz.points("New grasps: what the model predicted", points, labels=guesses,
                   x_label="box width (cm)", y_label="grip force (N)", classes=("predicts drop", "predicts success"))
    return _cache["model"]


def test_only_uses_what_is_known_before_the_grasp():
    unknown = [name for name in grasp_model.FEATURES if NEW_GRASPS[0][name] is None]
    assert not unknown, f"these features aren't known until AFTER the grasp, so the model can't use them to predict it: {unknown}"


def test_training_loss_goes_down():
    trained, losses = grasp_model.train(TRAIN, epochs=20)
    assert losses[-1] < losses[0], f"training should lower the loss, it went from {losses[0]:.3f} to {losses[-1]:.3f}"


def test_held_out_accuracy_is_good():
    accuracy = grasp_model.accuracy(model(), HELD_OUT)
    assert accuracy >= 0.85, f"accuracy on the held-out logbook rows should be at least 0.85, got {accuracy:.2f}"


def test_predicts_new_grasps_before_they_happen():
    accuracy = grasp_model.accuracy(model(), NEW_GRASPS)
    successes = sum(a["success"] for a in NEW_GRASPS) / len(NEW_GRASPS)
    assert accuracy >= 0.85, (
        f"accuracy on tomorrow's grasps (no slip reading yet) should be at least 0.85, got {accuracy:.2f}. "
        f"Always guessing the most common outcome would already score {max(successes, 1 - successes):.2f}")
