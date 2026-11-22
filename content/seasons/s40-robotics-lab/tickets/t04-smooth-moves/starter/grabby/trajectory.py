"""Trajectories: how Grabby moves from one pose to another, one motor tick at a time.

A pose is (shoulder_deg, elbow_deg). A path is the list of poses the motors are
sent, one per tick. We blend the joint angles in a straight line ("linear
interpolation in joint space"): at fraction t of the way, each angle is
start + (goal - start) * t.
"""
import math

MAX_STEP_DEG = 3.0  # a motor can turn at most 3 degrees per tick


def joint_path(start, goal, steps):
    """steps + 1 poses from start to goal, both included, evenly spaced."""
    path = []
    for i in range(steps):
        t = i / steps
        shoulder = start[0] + (goal[0] - start[0]) * t
        elbow = start[1] + (goal[1] - start[1]) * t
        path.append((shoulder, elbow))
    return path


def steps_needed(start, goal):
    """The fewest steps so that no joint turns more than MAX_STEP_DEG per step."""
    biggest_turn = abs(goal[0] - start[0])
    return max(1, math.ceil(biggest_turn / MAX_STEP_DEG))


def plan_move(start, goal):
    """The path from start to goal that the motors can follow."""
    return joint_path(start, goal, steps_needed(start, goal))
