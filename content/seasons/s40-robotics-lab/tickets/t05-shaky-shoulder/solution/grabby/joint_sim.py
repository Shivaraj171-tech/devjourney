"""A simple physics model of Grabby's shoulder joint, for testing the controller.

Each tick: the controller picks a torque, the motor clips it to what it can give,
gravity from the box pulls back a little, friction slows the joint, and the joint
speeds up or slows down (torque = inertia * acceleration).
"""
from grabby.limits import clamp
from grabby.pid import new_controller, pid_step

DT = 0.01  # seconds per tick (100 ticks per second)
MAX_TORQUE = 300.0  # the most the motor can give
INERTIA = 1.0
FRICTION = 2.0
BOX_LOAD = 10.0  # the box's weight, pulling the arm back


def simulate(target_deg, seconds=5.0, start_deg=0.0):
    """Angles of the joint, one per tick, while the controller moves it to target_deg."""
    controller = new_controller()
    angle, speed = start_deg, 0.0
    angles = []
    for _ in range(round(seconds / DT)):
        torque = clamp(pid_step(controller, target_deg, angle, DT), -MAX_TORQUE, MAX_TORQUE)
        acceleration = (torque - BOX_LOAD - FRICTION * speed) / INERTIA
        speed += acceleration * DT
        angle += speed * DT
        angles.append(angle)
    return angles
