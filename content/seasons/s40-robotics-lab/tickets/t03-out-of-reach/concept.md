**Joint limits and reachability**

A real joint can't spin forever: cables, the table and the arm itself get in the way. Each joint has a **range**, like a door that only opens 110°.

Before Grabby moves, two questions:
1. **Is the box in the ring?** Too far: more than both links stretched out (1.8 m). Too close: less than the forearm folded back over the upper arm (1.0 - 0.8 = 0.2 m). Inside that ring there is a pose.
2. **Is that pose inside every limit?** Check each joint, and try the other elbow if the first answer breaks one.

```python
SHOULDER = (-20, 200)
ELBOW = (-140, 140)

def within_limits(shoulder, elbow):
    shoulder_ok = SHOULDER[0] <= shoulder <= SHOULDER[1]
    elbow_ok = ELBOW[0] <= elbow <= ELBOW[1]
    return shoulder_ok and elbow_ok

print(within_limits(46, -97), within_limits(31, -147))  # True False
```

To *command* a joint safely, clamp it: `max(low, min(high, value))` keeps any value inside the range.

**Both ends of every limit.** A check that covers only one side (the far edge, or one joint) passes every test that only tries that side. The crash comes later, on the case nobody tried.

Ask "what about the other end?" For every limit an AI checks, look for the lower and the upper bound, for every joint.
