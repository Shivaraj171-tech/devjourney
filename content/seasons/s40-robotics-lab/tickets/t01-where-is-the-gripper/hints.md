Run the checks and look at the Lab viewer: the drawn arm is the real one, the pink cross is your `forward()`. For `forward(90, 0)` the real gripper is straight up at (0, 1.8). Where does the cross land? Try `math.cos(90)` in your head: does Python think that's degrees?
---
Two things are off. `math.cos` and `math.sin` take radians, so the degrees need `math.radians(...)` first. And the forearm's direction isn't just the elbow angle: the elbow is measured from the upper arm, which is already turned by the shoulder.
---
Make two angles in radians at the top of `forward`: one for the shoulder, and one for the forearm's direction, which is the shoulder angle plus the elbow angle. The upper-arm lines use the first one. Which angle should the two forearm lines use?
