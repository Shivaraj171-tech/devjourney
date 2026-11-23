**DH and PoE: two descriptions, one robot**

**Intuition**

DH and the product of exponentials describe the same physical fact, "joint i turns the rest of the arm about its axis", from two points of view. DH rides along the arm: each turn is about the z axis of a frame that moves with the links. PoE stands still in the base: each turn is about where that axis was at home. Both must give the same 4x4 for every q, or one of them is wrong.

And going from DH to PoE is mechanical. At the home pose, DH already tells you where every joint axis is: joint i turns about **z of frame i-1**, through **frame i-1's origin**. Read those six axes off the home frames, take M = the last frame at home, and you have the PoE description. (The other way, PoE to DH, needs the frame-placing rules again.)

**The maths**

Step 1: screws from the home frames. Let P_k = T_0_k(0), frame k at home, with z axis z_k and origin o_k. Joint i's axis is z_(i-1) through o_(i-1), so:

```text
S_i = (z_(i-1), -z_(i-1) × o_(i-1))      i = 1 .. n        M = P_n
```

Note the index: joint 1 uses frame 0 (the base), joint 6 uses frame 5. Frame 6 (the flange) holds no joint axis.

Step 2: split each DH matrix. With θ_i = q_i + offset_i, a turn about z can be pulled out in front: A_i(q_i) = Rz(q_i) A_i(0). So

```text
T_0_n(q) = Rz(q1) A1(0) Rz(q2) A2(0) ... Rz(qn) An(0)
```

Step 3: the conjugation trick. "Turn by q about frame P's z axis" written in the base is P Rz(q) P⁻¹: change into frame P, turn about its z, change back. And that's exactly the exponential of P's z-axis screw: P Rz(q) P⁻¹ = e^([S] q).

Step 4: slide the home frames to the right. With A1(0) = P_1, insert P_1⁻¹ P_1 = I just after Rz(q2), and use P_1 A2(0) = P_2:

```text
Rz(q1) P_1 Rz(q2) A2(0) ... = Rz(q1) [P_1 Rz(q2) P_1⁻¹] P_2 Rz(q3) ...
```

The bracket is e^([S2] q2). Repeat for every joint, and Rz(q1) = e^([S1] q1) since frame 0 is the base:

```text
T_0_n(q) = e^([S1] q1) e^([S2] q2) ... e^([Sn] qn) P_n          (= PoE, with M = P_n)
```

That's a proof. The tests are its check in code: random poses, all six joints at once, and one joint at a time.

**Worked example**

The conjugation trick on the two-link arm: the elbow's home frame is P = Tx(0.5). Turning 90° about its z axis, written in the base, should swing the home tip (0.9, 0, 0) round the elbow to (0.5, 0.4, 0):

```python
import math

def mul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(4)) for j in range(4)] for i in range(4)]

def tx(x):
    return [[1, 0, 0, x], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]

c, s = math.cos(math.pi / 2), math.sin(math.pi / 2)
Rz = [[c, -s, 0, 0], [s, c, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
turn_about_elbow = mul(mul(tx(0.5), Rz), tx(-0.5))   # P Rz P^-1
tip = [sum(turn_about_elbow[i][k] * v for k, v in enumerate((0.9, 0, 0, 1))) for i in range(3)]
print([round(t, 3) + 0 for t in tip])
# Output:
# [0.5, 0.4, 0.0]
```

**Watch out**

The off-by-one: taking joint i's axis from frame i instead of frame i-1. The home pose still matches (at q = 0 every exponential is the identity, so T = M whatever the screws), and the screws even look sensible (unit ω, ω·v = 0). Only a moved joint shows it, which is why we test each joint alone. Also: a non-zero DH θ offset is already inside the home frames, so PoE's q is the same joint value DH uses.

**AI check**

When an AI converts between kinematic descriptions, don't review the algebra line by line first: run both on twenty random configurations and compare the full 4x4s. Agreement at random poses is strong evidence; agreement at home is none.
