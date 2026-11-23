**Space and body Jacobians, and the adjoint**

**Intuition**

A rigid body's motion right now is a spin w plus a velocity, but the velocity of WHICH point? Every point of a spinning body moves differently. A twist V = (w, v) picks one: v is the velocity of the body point that is currently passing through the reference frame's origin (imagine the body extended forever, bolted to the gripper). Choose the base frame and you get the space twist V_s; choose the gripper's own frame and you get the body twist V_b: same motion, different bookkeeping. Twists are what the product of exponentials speaks, and Module 4's inverse kinematics uses the body one.

**The maths**

Step 1: from pose rates to twists. With T the gripper's pose and Ṫ its rate of change:

```text
[V_s] = Ṫ T⁻¹   (base frame)          [V_b] = T⁻¹ Ṫ   (gripper frame)
```

the same "which side" story as ticket 4's Ṙ Rᵀ and Rᵀ Ṙ, now for 4x4s.

Step 2: changing frames. A twist written in frame b becomes, in frame a (with T_ab = (R, p)):

```text
w_a = R w_b                   v_a = R v_b + p × (R w_b)

Ad(T_ab) = [[ R,      0 ],      a 6x6, for twists ordered (w, v)
            [ [p] R,  R ]]
```

The extra p × w is the lever: spinning about an axis away from the new origin drags the new origin around.

Step 3: the space Jacobian. Joint i's screw S_i (measured at home) is carried along by the joints before it:

```text
J_s column i = Ad(e^[S1]q1 ... e^[S(i-1)]q(i-1)) S_i
```

Step 4: the body Jacobian is the same columns in the gripper's frame: J_b = Ad(T⁻¹) J_s, with T = T_sb(q).

Step 5: back to the geometric Jacobian. The gripper point's own velocity is v_s + w × p: Jw = top rows of J_s, Jv = bottom rows + w × p. Three Jacobians, one motion.

**Worked example**

A frame 1 m up z, spinning about its own x axis: in the base frame, the base origin (1 m below that axis) is dragged along +y:

```python
def adjoint(R, p):
    def skew(w):
        return [[0, -w[2], w[1]], [w[2], 0, -w[0]], [-w[1], w[0], 0]]
    pR = [[sum(skew(p)[i][k] * R[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
    return [R[i] + [0, 0, 0] for i in range(3)] + [pR[i] + R[i] for i in range(3)]

I3 = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]]
Ad = adjoint(I3, [0, 0, 1.0])
V_b = [1.0, 0.0, 0.0, 0.0, 0.0, 0.0]
print([sum(Ad[i][k] * V_b[k] for k in range(6)) for i in range(6)])
# Output:
# [1.0, 0.0, 0.0, 0.0, 1.0, 0.0]
```

w is unchanged (the frames aren't turned); v = p × w = (0, 0, 1) × (1, 0, 0) = (0, 1, 0).

**Watch out**

Ordering conventions bite. Modern Robotics (and this course) orders twists (w, v), with [p]R in the BOTTOM-left of the adjoint. Other books order them (v, w), and their adjoint has [p]R in the TOP-right. Each is right for its own ordering; mixing them is wrong in a way that passes any test where p = 0. Also, v_s is NOT the gripper's velocity: in the 3D view it's drawn at the base origin, and it can be large even when the gripper barely moves.

**AI check**

When an AI writes an adjoint, ask which twist ordering it assumes and check it on one case you can do by hand: a pure spin about an axis 1 m away from the origin. If the answer has no linear part, the lever is missing.
