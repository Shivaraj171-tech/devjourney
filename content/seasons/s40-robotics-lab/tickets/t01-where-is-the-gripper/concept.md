**Forward kinematics**

Forward kinematics answers: "for these joint angles, where is the hand?" Think of giving directions with only turns and steps: "face 30°, walk 1 m; turn another 45°, walk 0.8 m". Each turn adds to the direction you were already facing.

For Grabby: the upper arm points along the shoulder angle, and the forearm points along shoulder + elbow. Walk each link with `cos` (across) and `sin` (up):

```python
import math
shoulder, elbow = math.radians(30), math.radians(45)
x = 1.0 * math.cos(shoulder) + 0.8 * math.cos(shoulder + elbow)
y = 1.0 * math.sin(shoulder) + 0.8 * math.sin(shoulder + elbow)
print(round(x, 2), round(y, 2))  # 1.07 1.27
```

`math.cos` and `math.sin` work in **radians**: a full turn is `2 * math.pi`, not 360. `math.radians(90)` converts degrees for you.

**Degrees into a radians function.** `math.cos(90)` doesn't fail, it quietly returns -0.45 (the cosine of 90 *radians*). Unit bugs never crash; the robot just goes somewhere else. And forgetting to add the shoulder angle makes the forearm point as if the upper arm were flat.

Test an AI's kinematics on poses you can picture: 0° and 90° should land on the axes. If straight up doesn't come out as (0, 1.8), don't trust the rest.
