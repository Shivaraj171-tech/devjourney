import math

from lab import viz

from grabby import reach_env as env
from grabby.arm import FOREARM, UPPER_ARM
from grabby.qlearn import ACTIONS, greedy_path, train

SEEDS = [0, 1, 2, 3, 4]
ARROWS = ["↓", "↑", "→", "←"]  # rows: shoulder stops (down = +30), columns: elbow stops (right = +30)

_cache = {}


def trained():
    """Train once per seed, and draw what seed 0 learned."""
    if "runs" not in _cache:
        _cache["runs"] = [train(seed) for seed in SEEDS]
        q, rewards = _cache["runs"][0]
        path = greedy_path(q)
        rows = range(len(env.SHOULDER_STOPS))
        cols = range(len(env.ELBOW_STOPS))
        values = [[max(q[(r, c)]) if (r, c) in q else None for c in cols] for r in rows]
        arrows = [[ARROWS[q[(r, c)].index(max(q[(r, c)]))] if (r, c) in q else "" for c in cols] for r in rows]
        goals = [(r, c) for r in rows for c in cols if env.distance_to_box((r, c)) < env.GOAL_DISTANCE]
        goal = path[-1] if path[-1] in goals else goals[0]
        viz.grid("What Grabby learned (seed 0)", values, path=path, start=env.START, goal=goal, arrows=arrows,
                 x_label="elbow -120° → 120°", y_label="shoulder 0° → 180°")
        episodes = list(range(1, len(rewards) + 1))
        viz.chart("Reward per episode", episodes, rewards, label="each episode", x_label="episode", y_label="total reward")
        average = [sum(rewards[max(0, i - 9):i + 1]) / len(rewards[max(0, i - 9):i + 1]) for i in range(len(rewards))]
        viz.chart("Reward per episode", episodes, average, label="average of the last 10")
        frames = [[math.radians(env.SHOULDER_STOPS[s]), math.radians(env.ELBOW_STOPS[e])] for s, e in path]
        viz.arm(frames, (UPPER_ARM, FOREARM), name="greedy", title="Seed 0, playing its best moves", target=env.TARGET)
    return _cache["runs"]


def reaches(q):
    """Does always-pick-the-best-move get to the box (and stop there) within 20 moves?"""
    path = greedy_path(q)
    return env.distance_to_box(path[-1]) < env.GOAL_DISTANCE


def neighbour_of_goal():
    """A (state, action) pair that moves the gripper onto the box."""
    for state in [(s, e) for s in range(len(env.SHOULDER_STOPS)) for e in range(len(env.ELBOW_STOPS))]:
        for action in range(len(ACTIONS)):
            if env.distance_to_box(state) >= env.GOAL_DISTANCE and env.distance_to_box(env.move(state, action)) < env.GOAL_DISTANCE:
                return state, action
    raise AssertionError("no cell next to the box: check TARGET and GOAL_DISTANCE")


def test_reaching_the_box_ends_the_episode():
    state, action = neighbour_of_goal()
    _, reward, done = env.step(state, action)
    assert done, f"moving onto the box should end the episode (done=True), got done={done}"
    assert reward > 0, f"getting the box should earn a positive reward, got {reward}"


def test_every_other_move_costs_something():
    _, reward, done = env.step(env.START, 0)
    assert not done, "one move from the start isn't at the box yet: done should be False"
    assert reward < 0, f"a move that doesn't get the box should cost a little (reward below 0), got {reward}"
    # Step off the box again (the opposite move): still near it, but not on it.
    state, action = neighbour_of_goal()
    back = action + 1 if action % 2 == 0 else action - 1
    _, near_reward, _ = env.step(env.move(state, action), back)
    assert near_reward < 0, f"a move that ends NEAR the box but not on it should cost a little too, got reward {near_reward}"


def test_learns_to_reach_the_box_for_most_seeds():
    runs = trained()
    wins = sum(reaches(q) for q, _ in runs)
    assert wins >= 4, f"Grabby should learn to reach the box (and stop) with at least 4 of 5 seeds, it did with {wins}"
