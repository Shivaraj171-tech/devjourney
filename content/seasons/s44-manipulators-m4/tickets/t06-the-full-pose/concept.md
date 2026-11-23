**Full-pose Newton-Raphson with the body twist error**

**Intuition**

To correct a position you subtract: "3 cm left". To correct a pose you need a MOTION: "turn this much about this axis, while sliding like this". Ask: which constant twist, held for one second, would carry the flange from where it is onto the target? That twist is the error, and it's a 6-vector Newton can use. Written in the flange's own frame, it pairs naturally with the body Jacobian from Module 3, which says how a joint step twists the flange in that same frame.

**The maths**

Step 1: the relative pose. From the flange's frame, the target is at T_bd = T_sb⁻¹ T_sd. If T_bd = I we're done.

Step 2: the error twist. The twist that reaches T_bd in unit time is its matrix logarithm (Module 2's exponential, run backwards):

```text
V_b = log(T_sb⁻¹ T_sd) = (w θ, v θ),    e^([V_b]) = T_bd
```

Step 3: the logarithm, piece by piece. The rotation part is Module 1's axis-angle: R = Rot(w, θ). The translation part is NOT simply p, because the exponential mixes the spin into the slide: p = G(θ) v with Module 2's G(θ) = I θ + (1 - cos θ)[w] + (θ - sin θ)[w]². So

```text
v = G⁻¹(θ) p,    G⁻¹(θ) = I/θ - [w]/2 + (1/θ - cot(θ/2)/2) [w]²
```

(For θ ≈ 0, no turn: v θ = p.)

Step 4: the Newton step, exactly ticket 5 with twists:

```text
J_b(q) dq = V_b      q ← q + dq      until |w θ| and |v θ| < tol
```

Step 5: why "converges" isn't "correct". Near the solution T_bd is close to I, θ is tiny, and θ G⁻¹ ≈ I - [w θ]/2: using p instead of θ G⁻¹ p makes an error of second order. Newton still reaches the same pose (zero is zero either way). But the twist error is also used to measure "how far", to damp and clamp steps, and to interpolate motions, and for those a wrong log gives wrong numbers far from the target. Test the log by itself: log(exp(S θ)) = S θ.

**Worked example**

A screw about the z axis through (0.3, 0, 0), turned 0.8 rad: exp it, then log it back. The translation p is not v θ:

```python
import math

w, q_axis, th = (0, 0, 1), (0.3, 0, 0), 0.8
v = (0.0, -0.3, 0.0)  # v = -w x q
c, s = math.cos(th), math.sin(th)
G = [[s, -(1 - c), 0], [1 - c, s, 0], [0, 0, th]]  # I θ + (1 - cos θ)[w] + (θ - sin θ)[w]² for w = z
p = [sum(G[i][j] * v[j] for j in range(3)) for i in range(3)]
k = 1 / th - 0.5 / math.tan(th / 2)
Ginv = [[1 / th - k, 0.5, 0], [-0.5, 1 / th - k, 0], [0, 0, 1 / th]]
back = [sum(Ginv[i][j] * p[j] for j in range(3)) * th for i in range(3)]
print([round(x, 3) for x in p], [round(x, 3) for x in back], [round(x * th, 3) for x in v])
# Output:
# [0.091, -0.215, 0.0] [0.0, -0.24, 0.0] [0.0, -0.24, 0.0]
```

**Watch out**

Twist ordering and frames must match: (w, v) for both V_b and J_b, both in the BODY frame. Mixing a space-frame error (T_sd T_sb⁻¹) with a body Jacobian converges slowly or not at all. And the angle near π: axis-angle needs Module 1's careful branch there.

**AI check**

Ask an AI for "the twist between two poses" and check whether it subtracts positions (not a twist) or takes a real logarithm. Then do the round trip on a screw you know.
