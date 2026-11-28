**Joint offsets, tools, and debugging forward kinematics**

**Two choices the sketch can't show**

A DH table describes the arm's geometry, but two more choices sit on top of it, and both are invisible in a 3D sketch of the arm.

The first is the **joint zero**: which physical position the robot calls q = 0. The DH rules put frames where the geometry says; the manufacturer puts zero where it is convenient (often "arm straight out" or "arm straight up"). The difference is the **θ offset** column: θ_i = q_i + offset_i. On many arms with a spherical wrist the elbow's DH frame forces a bent arm at θ3 = 0, so the vendor adds a 90° offset to make q3 = 0 mean "straight". Drop it and the robot still moves smoothly: every pose is just turned 90° at the elbow.

The second is the **tool**: DH stops at the flange (frame 6), but the gripper's fingertips are further out. That's one more fixed transform, T_6_tool, multiplied on the right. Forget it and every pose is off by the tool length, in a direction that changes with the orientation.

**An offset inside a DH row**

Step 1: an offset is a constant turn inside one DH row. For row 3:

```text
A3(q3) = Rz(q3 + offset3) Tz(d3) Tx(a3) Rx(α3)
```

Removing a 90° offset is the same as commanding q3 - 90° on the right robot: the forearm points 90° away from where the planner thinks, at every pose.

Step 2: the tool is a fixed transform after the flange (here a slide along z6):

```text
T_0_tool(q) = T_0_6(q) T_6_tool,      T_6_tool = Tz(0.12)
```

Step 3: debugging from logs, frame by frame. FK is a chain of frames, so compare each logged frame with the vendor sheet at the home pose, from the base outwards. The **first** frame that disagrees points at the row (or step) that is wrong: every frame before it is fine, every frame after inherits the error.

Step 4: two bugs can hide each other. Check them separately: is the flange right? Then is the tool offset right **relative to the flange** (exactly the tool length along z6)? A test of the fingertips alone mixes both.

**A 90° elbow offset at home**

The home pose of a simple "shoulder + elbow" chain with and without a 90° elbow offset, in the plane: where does the forearm point?

```python
import math

def forearm_direction(q2, q3, offset3):
    heading = q2 + q3 + offset3   # the turns add up along a planar chain
    return [round(math.cos(heading), 3) + 0, round(math.sin(heading), 3) + 0]

print(forearm_direction(0, 0, math.pi / 2), forearm_direction(0, 0, 0))
# Output:
# [0.0, 1.0] [1.0, 0.0]
```

With the DH twists of Grabby-6 the frame that holds the forearm points along x2 only once the offset is added; drop it and the forearm points down instead. The logs show exactly that: frame 3 matches the sheet, frame 4 is 0.45 m straight below where it should be.

**The numbers that get tidied**

Offsets are the most "tidied" numbers in a DH table: they look like noise next to the geometry, they differ between robots of the same family (the UR5e's are all zero), and some drivers apply them in software instead of the table. Never delete one without the vendor's home pose to check against. And a missing tool offset can't be seen in a frames-only view: draw the fingertips too.

**Diff the table cell by cell**

When an AI "cleans up" kinematics, diff the table cell by cell against the datasheet, then run the vendor's home-pose self-test and one known pick. Ask it to explain every changed number: "they're zero on another robot" is not a reason.
