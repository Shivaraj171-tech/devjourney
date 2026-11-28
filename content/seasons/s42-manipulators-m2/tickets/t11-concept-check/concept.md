**Forward kinematics: the whole module on one page**

**Each joint turns the rest of the arm**

Forward kinematics turns joint values into poses, and every method in this module is the same idea in different clothes: **each joint turns (or slides) everything after it, about its own axis**. Write that as one 4x4 per joint and multiply from the base outwards.

```text
joints and DOF      revolute (turn, q = angle) or prismatic (slide, q = distance); dof = m (N-1-J) + Σ f
composition         T_0_n = T_0_1 T_1_2 ... T_(n-1)_n, each in the frame before it; prefixes = every frame
DH                  one row per joint: T = Rz(θ) Tz(d) Tx(a) Rx(α), θ = q + offset; z(i-1) is joint i's axis
PoE                 screws S_i = (ω, -ω × q) at home, in the base; T(q) = e^[S1]q1 ... e^[Sn]qn M
wrist centre        spherical wrist: p_w = p - d6 z6 depends on q1..q3 only
```

**The identities under forward kinematics**

The identities everything else rests on:

```text
moving frames post-multiply      T_0_2 = T_0_1 T_1_2          (never T_1_2 T_0_1)
DH matrix (c = cos, s = sin)     [cθ  -sθcα   sθsα  a cθ]   last column: the new origin
                                 [sθ   cθcα  -cθsα  a sθ]   third column: the new z axis
                                 [0     sα     cα     d  ]
exponential of a twist           R = I + sinθ[ω] + (1-cosθ)[ω]²,   p = (Iθ + (1-cosθ)[ω] + (θ-sinθ)[ω]²) v
DH to PoE                        S_i from frame i-1 at home, M = frame n at home
conjugation                      P Rz(q) P⁻¹ = a turn about P's z axis, in base coordinates
```

Three patterns repeat through the module. First, **order and indices carry meaning**: the order of the product, the column order of a table, frame i-1 versus frame i, a row versus a column. None of these errors crash; they produce valid-looking poses in the wrong place. Second, **special poses hide bugs**: the home pose, symmetric rotations, axes through the origin. Test random poses, and properties that must hold (the wrist centre doesn't move with the wrist joints; a point on a screw axis stays put; DH equals PoE). Third, **a table is only meaningful with its convention**: standard or modified DH, (a, α, d, θ) or (θ, d, a, α), nominal or calibrated, which q is zero.

Where this goes next. Module 3 differentiates T(q): how fast does the gripper move when the joints move? The columns of that Jacobian are, almost literally, this module's screw axes (moved by the joints before them). Module 4 runs FK backwards: inverse kinematics, starting with the wrist-centre trick from ticket 7.

**One arm, composition and PoE**

The same two-link arm (0.5 m and 0.4 m) at q = (90°, -90°), by composition and by PoE in the plane; both must give the same tip:

```python
import math

def rz(q, x=0.0):
    c, s = math.cos(q), math.sin(q)
    return [[c, -s, x * c], [s, c, x * s], [0, 0, 1]]

def mul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(3)) for j in range(3)] for i in range(3)]

def turn_about(px, q):    # e^[S]q for a vertical axis through (px, 0): Tx(px) Rz(q) Tx(-px)
    return mul(mul(rz(0, px), rz(q)), rz(0, -px))

q1, q2 = math.pi / 2, -math.pi / 2
chain = mul(rz(q1, 0.5), rz(q2, 0.4))
poe = mul(mul(turn_about(0.0, q1), turn_about(0.5, q2)), rz(0, 0.9))
print([round(chain[i][2], 3) + 0 for i in range(2)], [round(poe[i][2], 3) + 0 for i in range(2)])
# Output:
# [0.4, 0.5] [0.4, 0.5]
```

**Conventions, again**

Libraries disagree on almost every convention here: DH flavour and column order, twist order (ω, v) or (v, ω), body or space screws, quaternion order in poses. When two systems meet, compare one pose you can check by hand, then random poses, before trusting either.

**A toolkit for AI-written kinematics**

Your module-wide toolkit for AI-written kinematics: one hand-checked pose per robot (the datasheet's home pose), random poses against an independent implementation, property tests (decoupling, points on axes, DH = PoE), and a cell-by-cell diff of any table it "tidied".
