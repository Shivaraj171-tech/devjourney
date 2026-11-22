"""Grabby's arm: two links, seen from above, joined at the shoulder and the elbow.

The shoulder sits at (0, 0). Link 1 (the upper arm) is 1.0 m long, link 2 (the
forearm) is 0.8 m long. The motors report their angles in DEGREES:

  shoulder: the angle of the upper arm, measured from the x axis
            (anticlockwise is positive, like on a maths graph)
  elbow:    the angle of the forearm, measured from the upper arm
            (0 means the arm is straight)
"""
import math

UPPER_ARM = 1.0  # metres
FOREARM = 0.8  # metres


def forward(shoulder_deg, elbow_deg):
    """Where the gripper is, as (x, y) in metres, for these joint angles in degrees."""
    shoulder = math.radians(shoulder_deg)
    # The forearm's direction is the upper arm's direction PLUS the elbow bend.
    forearm = math.radians(shoulder_deg + elbow_deg)
    elbow_x = UPPER_ARM * math.cos(shoulder)
    elbow_y = UPPER_ARM * math.sin(shoulder)
    x = elbow_x + FOREARM * math.cos(forearm)
    y = elbow_y + FOREARM * math.sin(forearm)
    return x, y
