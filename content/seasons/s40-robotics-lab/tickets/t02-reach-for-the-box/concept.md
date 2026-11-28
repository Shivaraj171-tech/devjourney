**Inverse kinematics**

Inverse kinematics goes backwards: "the box is at (x, y); which joint angles get the gripper there?" It's what your arm does when you reach for a cup without thinking about your elbow.

For two links it's a triangle: shoulder, elbow, gripper. You know all three sides (1.0, 0.8, and the distance to the box), so the **law of cosines** gives the elbow angle. Then aim the shoulder at the box and correct for the bend:

```python
import math
x, y = 1.2, 0.5
c = (x * x + y * y - 1.0**2 - 0.8**2) / (2 * 1.0 * 0.8)
elbow = math.acos(c)
shoulder = math.atan2(y, x) - math.atan2(0.8 * math.sin(elbow), 1.0 + 0.8 * math.cos(elbow))
print(round(math.degrees(shoulder), 1), round(math.degrees(elbow), 1))  # -15.3 88.2
```

Most points have two answers: elbow bent one way or the other ("down" and "up"), like your own arm.

`math.atan(y / x)` only knows the slope, not which side of the table the box is on: (1, 1) and (-1, -1) give the same angle, and x = 0 divides by zero. `math.atan2(y, x)` takes both numbers and gets the direction right all the way round.

**Run it back through forward kinematics.** Check an AI's inverse kinematics by running it back through forward kinematics, for targets on every side, not just the easy one in front.
