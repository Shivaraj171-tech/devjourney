**Statics: τ = Jᵀ F**

**Shopping bag at arm's length**

Hold a bag of shopping with your arm straight out: your shoulder burns, your elbow less so, your wrist hardly at all. Every joint resists the bag's weight with a torque equal to the force times its lever arm, and the lever arms are exactly what the Jacobian's columns measure: how far, and in which direction, the hand moves when that joint turns. A joint that can't move the hand in the force's direction doesn't feel the force at all. Speeds go out through J; forces come back through Jᵀ.

**Power in equals power out**

Step 1: power balance. At rest the motors don't do net work, but imagine a tiny motion q̇ (virtual work). The power the motors put in is τ · q̇; the power the gripper delivers to the box is F · v. With no losses they're equal, and v = J q̇:

```text
τ · q̇ = F · (J q̇) = (Jᵀ F) · q̇       for EVERY q̇
```

Step 2: an identity that holds for every q̇ forces the vectors to be equal:

```text
τ = Jᵀ F
```

Shapes check it: J is m × n, F has m entries (a force, or a 6-entry wrench of force and moment for a 6-row J), Jᵀ F has n entries, one torque per joint. J F wouldn't even fit unless J happens to be square, which is exactly when the bug hides.

Step 3: holding a box. Gravity pulls the box down with m g; to hold it still the gripper pushes UP with F = (0, 0, m g). Only the linear rows Jv matter for a pure force: τ = Jvᵀ F, and τ_i = (column i of Jv) · F, the joint's lever arm times the force.

Step 4: the arm straight out and level (our 3-DOF arm, q = 0). The shoulder's column is (0, 0, a2 + a3) and the elbow's is (0, 0, a3), so

```text
τ1 = 0 (the base turns about the vertical: gravity can't load it)
τ2 = m g (a2 + a3)          τ3 = m g a3
```

Step 5: the duality. Near a singularity the arm can't MOVE in some direction, and in that same direction it can RESIST forces with almost no torque: a stretched arm holds a pull along its length on its bones, not its motors.

**Holding 2 kg straight out**

Our 3-DOF arm straight out, holding 2 kg:

```python
g, m, a2, a3 = 9.81, 2.0, 0.4, 0.3
Jv = [[0.0, 0.0, 0.0], [0.7, 0.0, 0.0], [0.0, 0.7, 0.3]]  # columns: base, shoulder, elbow
F = [0.0, 0.0, m * g]
tau = [sum(Jv[r][c] * F[r] for r in range(3)) for c in range(3)]
wrong = [sum(Jv[c][r] * F[r] for r in range(3)) for c in range(3)]
print([round(t, 3) for t in tau], [round(t, 3) for t in wrong])
# Output:
# [0.0, 13.734, 5.886] [0.0, 0.0, 5.886]
```

Jᵀ F: the shoulder carries 13.7 N m, the elbow 5.9. J F (rows instead of columns) mixes up which joint gets which lever, and it says the shoulder holds nothing.

**J F runs too**

For a square J, J F and Jᵀ F both run without error, and for special (symmetric) Jacobians they even agree. The shape check is free: an n-joint arm with a 6-row J needs a 6-entry wrench and gives n torques. The sign matters too: F is the force the gripper EXERTS on the world (up, to hold the box), not the force of gravity on the box.

**Transposed, and which way F points**

Ask an AI for holding torques and check two things: does it transpose J, and is its F what the gripper exerts? Then check a pose you can do in your head: straight out and level, the shoulder holds weight × reach.
