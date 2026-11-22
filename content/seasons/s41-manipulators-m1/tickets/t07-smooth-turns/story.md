**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-107: Grabby whips boxes round in the middle of a turn

To turn a box from one orientation to another, Grabby blends between two quaternions, one small step per tick: `slerp(q0, q1, t)` in `rigid/slerp.py`. Byte replaced the real slerp with "lerp, then normalise: same thing, fewer trig calls".
It isn't the same thing. On a 160° turn the box crawls at the start, whips through the middle (that's where the soup spills 🍜), and crawls again at the end. And sometimes, for the very same target, Grabby takes the long way round: 200° instead of 160°, swinging the box past the shelf edge.
The 3D view plays your slerp next to a naive lerp. The naive one isn't even a rotation in the middle: watch its axes shrink.
