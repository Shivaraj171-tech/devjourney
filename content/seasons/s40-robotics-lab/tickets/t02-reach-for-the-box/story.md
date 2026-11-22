**From:** Rosa (Robotics Engineer)
**Ticket:** LAB-102: Grabby only reaches to the right

Now that `forward()` is right, we need the opposite: the camera sees a box at (x, y), and Grabby must work out the joint angles to get there. That's `inverse()` in `grabby/ik.py`.
Boxes on the right work fine. A box straight ahead crashes it with a ZeroDivisionError, and boxes on the left send the gripper to the wrong side of the table. 📦
Fix `inverse()` so `forward(*inverse(x, y))` lands on the box anywhere on the shelf. The Lab viewer animates Grabby reaching for each box, with an orange target on every one.
