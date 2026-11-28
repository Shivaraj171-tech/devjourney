**Rigid-body motion: the whole module on one page**

**Six numbers for a rigid body**

A rigid body has six degrees of freedom: three for where it is, three for which way it faces. Everything in this module is a way of writing those down, and each way is good at something different:

```text
rotation matrix R (9 numbers)   compose and apply: one product; columns = turned axes
Euler angles (3)                 humans and dashboards; gimbal lock at pitch ±90°
axis-angle (4, |u| = 1)          "turn θ about u": the most physical; easy to log
unit quaternion (4, |q| = 1)     compose cheaply, no lock, slerp; q and -q are equal
homogeneous T (16)               rotation + position in one matrix: chains and inverses
```

Robots convert between them constantly: a camera sends axis-angle, an IMU integrates quaternions, an operator types Euler angles, and the kinematics multiplies 4x4 transforms.

**The identities under rigid motion**

The few identities that everything else is built from:

```text
R = [x' y' z']  (columns)        RᵀR = I, det R = +1         R⁻¹ = Rᵀ
"A, then B" (world axes) = B A    chains (moving frames): T_a_b T_b_c = T_a_c
Rodrigues: R = I + sin θ K + (1 - cos θ) K²    trace R = 1 + 2 cos θ
q = (cos θ/2, sin θ/2 u)         v' = q (0, v) q*            slerp weights sin((1-t)Ω), sin(tΩ)
T = [R t; 0 1]                   T⁻¹ = [Rᵀ  -Rᵀt; 0 1]      p_a = T_a_b p_b
```

Two patterns repeat. First, **the order of operations is part of the meaning**: turns don't commute, and neither do "turn" and "move". Second, **the description can be singular even when the robot is fine**: Euler angles at gimbal lock, axis-angle's axis at 180°, slerp's 0/0 when the turns are equal. Every one of those is a place where code divides by something that can be zero, so every one needs a separate branch and a test.

Where this goes next. Module 2 (forward kinematics) multiplies one 4x4 per joint, exactly like the incident ticket, written in Denavit-Hartenberg parameters or as a product of exponentials (e to the power of a twist, the 6D cousin of Rodrigues). Module 3 differentiates that product: the Jacobian, whose singularities are gimbal lock's big sibling.

**One 90° turn, three descriptions**

The same 90° turn about z in three descriptions, all sending x to y:

```python
import math

R = [[0, -1, 0], [1, 0, 0], [0, 0, 1]]
angle = math.degrees(math.acos((R[0][0] + R[1][1] + R[2][2] - 1) / 2))
q = [math.cos(math.radians(45)), 0.0, 0.0, math.sin(math.radians(45))]
yaw = math.degrees(math.atan2(R[1][0], R[0][0]))
print(round(angle, 1), [round(c, 3) for c in q], round(yaw, 1))
# Output:
# 90.0 [0.707, 0.0, 0.0, 0.707] 90.0
```

**Conventions libraries disagree on**

Libraries disagree on conventions: quaternions stored (w, x, y, z) or (x, y, z, w); Euler angles in a dozen orders; "transform from A to B" meaning either direction. When two systems meet, test with one pose you can picture before trusting any numbers.

**A toolkit for AI-written robotics code**

Your module-wide toolkit for AI-written robotics code: one hand-checkable pose per function (a quarter turn about one axis), a round trip for every conversion, the edge cases (0°, 180°, pitch ±90°, a non-unit input), and the names in every product.
