**Watching the condition number**

**Intuition**

A resolved-rate controller drives the gripper by solving J q̇ = V for the joint speeds, many times a second. That works beautifully until the arm nears a singularity: then J is nearly non-invertible, and small or harmless-looking V's need huge q̇. A good controller watches a number that says "how close to singular", slows down as it rises and stops before the motors saturate. The standard number is the condition number κ: how lopsided the velocity ellipsoid is. Monitors built on it are only as good as that number: overestimate it and the robot freezes for nothing; underestimate it and the wrist whips round.

**The maths**

Step 1: the singular values. J's singular values σ1 ≥ ... ≥ σ6 ≥ 0 are the ellipsoid's radii (ticket 7). They come from the symmetric matrix Jᵀ J (6 × 6):

```text
eigenvalues of Jᵀ J  =  σ1², σ2², ..., σ6²         so     σ_k = sqrt(λ_k)
```

Step 2: the condition number:

```text
κ = σ_max / σ_min           1 = a perfect ball,   ∞ = singular
```

Step 3: why it predicts trouble. Solving J q̇ = V, the worst-case amplification from V to q̇ is 1/σ_min, and relative errors in V can be amplified by up to κ. For the UR5e near the wrist flip, σ_min ≈ 0.33 sin(q5), shrinking with q5, so the speed of joints 4 and 6 grows like 1 / sin(q5).

Step 4: the forgotten square root. If you skip the root you report λ_max / λ_min = κ²: at a healthy κ = 14.3 you'd report 204 and cross a stop threshold of 200 nowhere near the singularity. A squared monitor is too cautious far away and much too jumpy near: thresholds tuned on it mean nothing.

Step 5: thresholds. For our UR5e path, the true κ crosses 50 around q5 = 7.4° (slow down) and 200 around q5 = 1.8° (stop), where joint 4 would need about 8 rad/s for a 0.2 rad/s spin.

Step 6: units. The UR5e's J has three linear rows (m/s per rad/s) and three angular rows (rad/s per rad/s). Uniform scaling never changes κ, but changing the length unit scales only the linear rows, and then κ changes: at the q5 = 7.4° pose κ is 50 with lengths in metres and about 9,800 in millimetres. So for this mixed-unit 6x6 J, κ is NOT scale-free, and the 50 and 200 thresholds are only valid in metres and radians. Robust monitors make κ unit-free first: divide the linear rows by a characteristic length L of the arm (or weight the rows), or watch the linear and angular parts separately.

**Worked example**

A diagonal Jacobian makes the singular values visible directly:

```python
import math

J = [[3.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 2.0]]
JtJ = [[sum(J[k][i] * J[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
lams = sorted((JtJ[i][i] for i in range(3)), reverse=True)  # diagonal: eigenvalues on the diagonal
sigmas = [math.sqrt(x) for x in lams]
print(lams, sigmas, sigmas[0] / sigmas[-1], lams[0] / lams[-1])
# Output:
# [9.0, 4.0, 1.0] [3.0, 2.0, 1.0] 3.0 9.0
```

J stretches by 3, 2 and 1: κ = 3. Without the square root you'd report 9.

**Watch out**

"Same ordering, faster" was Byte's argument for dropping the root, and the ordering IS preserved: σ² sorts like σ. But a monitor compares against thresholds, and thresholds don't survive squaring. Optimisations that change units are bugs. Also, κ beats manipulability w for "near singular" because it ignores the arm's overall size (w would freeze a small arm everywhere), but it is not scale-free for this J: its thresholds belong to metres and radians (Step 6). Feed the monitor a Jacobian in millimetres and it says "stop" even at a healthy q5 = 40° (κ ≈ 1,900).

**AI check**

AIs (and Stack Overflow answers) often write "the singular values are the eigenvalues of Jᵀ J". When an AI computes a condition number, check one diagonal matrix by hand, like the example above, before trusting any threshold built on it.
