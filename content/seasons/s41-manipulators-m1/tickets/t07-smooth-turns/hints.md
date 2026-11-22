Read the constant-speed check's message: the eight equal time steps turn 15.6°, 18.8°, 21.8°, 23.7°... A straight line between two points on a circle, pushed back out onto the circle, moves fastest in the middle. And the short-way check gives the camera's -q1, which is the same orientation as q1. What is dot(q0, -q1)?
---
Two fixes. (1) q and -q are the same rotation, but blending towards -q goes the long way. If dot(q0, q1) < 0, negate q1 (and the dot) first. (2) Real slerp walks along the sphere: with θ = acos(dot), the weights are sin((1 - t) θ) / sin θ and sin(t θ) / sin θ.
---
After the flip, if the dot is above 0.9995 the two are almost equal and sin θ is almost 0: keep the normalised lerp for that case (it's accurate there). Otherwise compute θ = math.acos(d), s = math.sin(θ), a = math.sin((1 - t) * θ) / s, b = math.sin(t * θ) / s, and return a * q0 + b * q1, component by component.
