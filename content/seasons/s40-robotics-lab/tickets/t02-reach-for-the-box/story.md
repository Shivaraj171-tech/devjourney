**From:** Rosa (Robotics Engineer)
**Ticket:** LAB-102: Grabby only reaches to the right

`forward()` is right now. Next, the opposite: the camera sees a box at (x, y), and Grabby has to work out the joint angles to get there. That's `inverse()` in `grabby/ik.py`.
Boxes on the right, fine. A box straight ahead, ZeroDivisionError. Boxes on the left, gripper on the wrong side of the table.
Fix `inverse()` so `forward(*inverse(x, y))` lands on the box anywhere on the shelf. The Lab viewer animates Grabby reaching for each box, with an orange target on every one.
