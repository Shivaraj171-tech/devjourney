Run the checks and watch the Lab viewer: Grabby reaches the box on the right, then stays put or swings to the wrong side for the others. The elbow angle only depends on the distance, so it's fine. Look at the line that aims the shoulder.
---
`math.atan(y / x)` only gets the slope y / x. A box at (-0.9, 0.9) has slope -1, exactly like a box at (0.9, -0.9) on the other side, so it aims at the wrong one. And x = 0 divides by zero.
---
Python has a version of arctangent that takes y and x as two separate numbers, so it knows which side the box is on (and never divides). The line in `inverse` that sets `aim` needs it. The `bend` line already uses it: which function is that?
