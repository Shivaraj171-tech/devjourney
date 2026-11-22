"""Grasp attempts from Grabby's logbook (made up, but shaped like the real thing).

Each attempt is a dict:
  width_cm:   how wide the box is (wider boxes are harder to hold)
  force_n:    how hard the gripper squeezed, in newtons
  offset_deg: how far off-centre the gripper grabbed
  slipped:    did the slip sensor fire? 1 or 0. The sensor fires DURING the lift,
              so it is only known AFTER the grasp has happened (None before)
  success:    1 if the box made it into the bin, else 0 (what we want to predict)
"""
import random


def make_attempts(count, seed, before_grasp=False):
    """`count` attempts. before_grasp=True: the new grasps we must predict, with no slip reading yet."""
    rng = random.Random(seed)
    attempts = []
    for _ in range(count):
        width = rng.uniform(2, 10)
        force = rng.uniform(5, 40)
        offset = rng.uniform(0, 30)
        score = 0.35 * force - 0.9 * width - 0.12 * offset - 1.5 + rng.gauss(0, 1.0)
        success = 1 if score > 0 else 0
        if before_grasp:
            slipped = None
        elif success:
            slipped = 0
        else:
            slipped = 1 if rng.random() < 0.97 else 0
        attempts.append({"width_cm": width, "force_n": force, "offset_deg": offset, "slipped": slipped, "success": success})
    return attempts
