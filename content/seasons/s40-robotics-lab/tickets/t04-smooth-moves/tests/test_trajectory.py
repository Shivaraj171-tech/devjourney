import math

from lab import viz

from grabby.arm import FOREARM, UPPER_ARM, forward
from grabby.trajectory import MAX_STEP_DEG, joint_path, plan_move

HOME = (0.0, 0.0)
SHELF_POSE = (30.0, 120.0)


def biggest_jump(path):
    """The largest turn of any joint between two ticks."""
    return max(max(abs(b[0] - a[0]), abs(b[1] - a[1])) for a, b in zip(path, path[1:]))


def show(path):
    viz.arm([[math.radians(s), math.radians(e)] for s, e in path], (UPPER_ARM, FOREARM), name="move",
            title="Home to the shelf, tick by tick", target=forward(*SHELF_POSE))
    ticks = list(range(len(path)))
    viz.chart("Joint angles", ticks, [p[0] for p in path], label="shoulder", x_label="tick", y_label="degrees")
    viz.chart("Joint angles", ticks, [p[1] for p in path], label="elbow")
    jumps = [max(abs(b[0] - a[0]), abs(b[1] - a[1])) for a, b in zip(path, path[1:])]
    viz.chart("Biggest turn per tick", ticks[1:], jumps, label="turn", x_label="tick", y_label="degrees", hline=MAX_STEP_DEG)


def test_path_starts_at_the_start_and_ends_at_the_goal():
    path = joint_path((0, 0), (10, 20), 5)
    assert path[0] == (0, 0), f"the first pose should be the start (0, 0), got {path[0]}"
    assert math.isclose(path[-1][0], 10) and math.isclose(path[-1][1], 20), f"the last pose should be the goal (10, 20), got {path[-1]}"


def test_path_has_steps_plus_one_poses():
    path = joint_path((0, 0), (10, 20), 5)
    assert len(path) == 6, f"5 steps need 6 poses (start, 4 in between, goal), got {len(path)}"


def test_no_joint_turns_more_than_3_degrees_per_tick():
    path = plan_move(HOME, SHELF_POSE)
    show(path)
    jump = biggest_jump(path)
    assert jump <= MAX_STEP_DEG + 1e-9, f"a joint turns {jump:.1f} degrees in one tick, the motors can do at most {MAX_STEP_DEG}"


def test_the_move_is_not_slower_than_it_needs_to_be():
    path = plan_move(HOME, SHELF_POSE)
    # The elbow turns 120 degrees, 3 at a time: 40 steps, so 41 poses.
    assert len(path) == 41, f"home to the shelf should take 41 poses (40 steps of 3 degrees for the elbow), got {len(path)}"
