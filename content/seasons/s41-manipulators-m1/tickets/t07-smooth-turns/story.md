**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-107: Grabby whips boxes round in the middle of a turn

To turn a box from one orientation to another, Grabby blends between two quaternions, one small step per tick: `slerp(q0, q1, t)` in `rigid/slerp.py`. Byte "optimised" it last week, for "fewer trig calls".
Since then, on a 160° turn the box crawls at the start, whips through the middle and crawls again at the end. The middle is where the soup spills. And sometimes, for the very same target, Grabby takes the long way round, 200° instead of 160°, and swings the box past the shelf edge.
The 3D view plays your slerp next to a naive lerp. The naive one isn't even a rotation in the middle. Watch its axes shrink.
