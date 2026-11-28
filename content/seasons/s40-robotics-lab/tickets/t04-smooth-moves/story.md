**From:** Rosa (Robotics Engineer)
**Ticket:** LAB-104: Grabby stops short, then jerks

Grabby knows WHERE to go. This ticket is HOW it gets there. The motors take one pose per tick and turn at most 3° per tick, so a move is a list of poses: a trajectory.
Byte's `grabby/trajectory.py` has two problems. Every move stops one tick short of the goal, so the box is never quite reached. And long elbow moves jump 12° in one tick. The motor driver rejects those, and Grabby jerks.
Fix the path so it includes both ends and no joint ever turns more than 3° per tick. The Lab viewer plots both joint angles per tick, and the biggest turn per tick against the 3° line.
