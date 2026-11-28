**Debugging a pose chain**

**Bugs between the factors**

A robot's pose is a product of small, simple transforms, one per joint and link. Each factor is easy to get right on its own. The bugs live in the **order**: the order of the factors in the chain, and the order of "turn" and "move" inside each factor. Python multiplies any two 4x4 matrices you give it, so a wrong order never crashes. It just puts the gripper somewhere else.

Debugging chains is a skill you'll use in every module from here on (forward kinematics in Module 2 is exactly this). The method: test poses you can picture, one joint at a time, and let the numbers tell you which factor is wrong.

**Root outwards, touching names cancel**

Step 1, the chain. With the naming rule from ticket 9, the gripper's pose is the product from the root outwards; touching names cancel:

```text
T_base_gripper = T_base_turntable(ψ) · T_turntable_wrist(θ) · T_wrist_gripper(φ)
```

Reverse it (T_wrist_gripper · T_turntable_wrist · T_base_turntable) and the touching names no longer match: gripper next to turntable, wrist next to base. Concretely, with the turntable's transform on the far right it acts first, on the gripper's own origin, which sits right on the turning axis: the yaw turns a point that can't move, so yaw no longer swings the arm (look at the self-test lines in the logs).

Step 2, inside one link: turn-then-move or move-then-turn. Write Rot for a pure turn and Trans(d) for a pure move. Read a product right to left as "what happens to a point at the child frame's origin", or left to right as "moves of the frame itself, each in the frame's current axes":

```text
Rot(θ) Trans(d):  turn the frame first, then walk d along the TURNED x axis
Trans(d) Rot(θ):  walk d along the old x axis, then turn in place at the end
```

Multiply them out (block form from ticket 8): Rot · Trans has translation R d, while Trans · Rot has translation d. Same rotation, different position. A shoulder tilts the whole arm, so the shoulder's link is Rot then Trans: the wrist ends up at R d, below the shoulder. A tool that twists at the fingertips is Trans then Rot: the twist doesn't move the fingertips.

Step 3, the diagnostic table. Pick joint values whose answer you can see:

```text
all 0          → (UPPER_ARM + TOOL, 0, BASE_HEIGHT)   every bug hides here: turns are identity
yaw 90°        → arm swings to +y                       tests the chain order
pitch 30°      → whole arm tips down from the shoulder  tests turn-vs-move in the link
roll anything  → fingertips don't move                  tests the wrist's turn-vs-move
```

Each row isolates one factor. The all-zero pose passes with every bug, which is why "it works at home position" means nothing.

**Turn then move, move then turn**

Turn-then-move versus move-then-turn for the shoulder link, pitch 30°, arm 0.5 m (positive pitch tips x down towards -z):

```python
import math

c, s = math.cos(math.radians(30)), math.sin(math.radians(30))
R = [[c, 0, s], [0, 1, 0], [-s, 0, c]]
d = [0.5, 0, 0]
turn_then_move = [round(sum(R[i][k] * d[k] for k in range(3)), 3) for i in range(3)]
move_then_turn = d
print(turn_then_move, move_then_turn)
# Output:
# [0.433, 0.0, -0.25] [0.5, 0, 0]
```

Only the first puts the wrist 25 cm below the shoulder, where a tilted arm's wrist really is.

**Fixed at one pose, broken at the next**

Don't "fix" a chain by trial and error on one pose: a wrong order can match at one pose and fail at the next. And watch for code that looks tidier but reads the chain backwards ("gripper first, it's the part we care about").

**A diagnostic table for a refactored chain**

When an AI writes or refactors a kinematic chain, run the diagnostic table: home pose, then each joint alone at 90° or 30°. Ask it to explain each factor's turn-vs-move order; if it can't, test harder.
