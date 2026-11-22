import math

from lab import viz

from grabby.arm import FOREARM, UPPER_ARM, forward
from grabby.ik_net import make_examples, predict_angles, train_ik_net

EXAMPLES = make_examples(200, seed=1)  # worked out by grabby.ik
NEW_BOXES = make_examples(40, seed=2)  # boxes the network has never seen

_cache = {}


def trained():
    """Train once, and draw the learning curve and the arm reaching new boxes."""
    if "net" not in _cache:
        net, losses = train_ik_net(EXAMPLES)
        _cache["net"], _cache["losses"] = net, losses
        viz.chart("Loss", [100 * (i + 1) for i in range(len(losses))], losses, label="loss", x_label="update",
                  y_label="mean squared error", hline=0.01, log=True)
        frames, targets = [], []
        for x_cm, y_cm, _ in NEW_BOXES[:6]:
            s, e = predict_angles(net, x_cm, y_cm)
            pose = [math.radians(s), math.radians(e)] if math.isfinite(s) and math.isfinite(e) else [0.0, 0.0]
            for _ in range(12):
                frames.append(pose)
                targets.append((x_cm / 100, y_cm / 100))
        viz.arm(frames, (UPPER_ARM, FOREARM), name="new boxes", title="The network reaching for new boxes", targets=targets,
                trail=False)
    return _cache["net"], _cache["losses"]


def gripper_miss(net, x_cm, y_cm):
    """How far (in metres) the gripper ends up from the box, using the network's angles."""
    s, e = predict_angles(net, x_cm, y_cm)
    if not (math.isfinite(s) and math.isfinite(e)):
        return math.inf
    gx, gy = forward(s, e)
    return math.hypot(gx - x_cm / 100, gy - y_cm / 100)


def test_loss_stays_a_real_number():
    _, losses = trained()
    bad = [i for i, loss in enumerate(losses) if not math.isfinite(loss) or loss > 1e6]
    assert not bad, f"the loss blew up (to {losses[bad[0]]:.3g}) by update {100 * (bad[0] + 1)}: the steps are too big for these inputs"


def test_loss_falls_below_0_01():
    _, losses = trained()
    assert losses[-1] < 0.01, f"after training, the loss should be below 0.01, got {losses[-1]:.3g}"


def test_network_reaches_new_boxes():
    net, _ = trained()
    misses = [gripper_miss(net, x, y) for x, y, _ in NEW_BOXES]
    average = sum(misses) / len(misses)
    assert average < 0.1, f"on boxes it has never seen, the gripper should land within 0.10 m on average, got {average:.3g} m"
