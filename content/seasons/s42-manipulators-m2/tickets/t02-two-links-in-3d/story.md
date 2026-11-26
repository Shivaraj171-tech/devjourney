**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-202: Where is the elbow, where is the tip?

Remember the flat two-link arm from the Robotics Lab? There we added angles with trigonometry. That trick stops working the moment an arm leaves the plane, so we're redoing it the way every robotics library does: **one 4x4 transform per joint, multiplied together**. Same arm, drawn in 3D.
`joint_link(q, length)` in `kin/planar2.py` already builds one joint's transform. What's missing is `frames_in_base(links)`: every joint's frame in the **base** frame, so the 3D view (and everything after this ticket) knows where each joint is. Byte left a draft. In the 3D view the elbow looks fine. The tip doesn't.
The tests compare your tip with the textbook trigonometry at several poses.
