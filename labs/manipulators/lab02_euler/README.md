# Lab 02 · Euler angles (ZYX) and gimbal lock

Module 1 · 100 XP · browser twin: Module 1, "Euler angles"

## Intuition

Three numbers are the minimum to describe an orientation, and Euler angles are
the most human way to do it: *turn (yaw) about z, then tilt (pitch) about the new
y, then bank (roll) about the newest x*. Drones, IMUs and teach pendants use
this "ZYX" convention all the time.

The catch: picture a camera gimbal. Tilt the middle ring by 90° and the outer
and inner rings now spin about the **same** axis. You still have three motors,
but only two independent directions of motion. That is **gimbal lock**. It is a
property of the *parametrisation*, not of the physical rotation, which is why
robots store orientation as matrices or quaternions and only show Euler angles
to humans.

## Key maths, step by step

**1. Composition.** Rotating about *body* (moving) axes composes on the right:

    R = Rz(ψ) · Ry(θ) · Rx(φ)        ψ = yaw, θ = pitch, φ = roll

**2. Write it out** (c = cos, s = sin):

    R = [[cψ cθ,  cψ sθ sφ − sψ cφ,  cψ sθ cφ + sψ sφ],
         [sψ cθ,  sψ sθ sφ + cψ cφ,  sψ sθ cφ − cψ sφ],
         [ −sθ ,        cθ sφ      ,        cθ cφ     ]]

**3. Invert it.** Read off the simple entries:

    R[2,0] = −sθ
    column 0 = cθ (cψ, sψ, ·)    =>  cθ = hypot(R[0,0], R[1,0])  (≥ 0, so θ ∈ [−π/2, π/2])
    θ = atan2(−R[2,0], cθ)
    ψ = atan2(R[1,0], R[0,0])          (both entries carry the same positive factor cθ)
    φ = atan2(R[2,1], R[2,2])          (both carry cθ)

Always use `atan2`: `arcsin` loses the quadrant and blows up its derivative near ±1.

**4. Gimbal lock.** When cθ = 0 those last two formulas become atan2(0, 0).
Put θ = +π/2 into step 2 and use the angle-difference identities:

    R = [[0, −sin(ψ − φ), cos(ψ − φ)],
         [0,  cos(ψ − φ), sin(ψ − φ)],
         [−1,      0     ,     0     ]]

Only ψ − φ appears. Infinitely many (ψ, φ) pairs give the same R. Pick the
convention φ = 0, then ψ = atan2(−R[0,1], R[1,1]). (For θ = −π/2 only ψ + φ
appears, and the same formula works with φ = 0.)

**5. Gimbal lock as lost rank.** Angular velocity from Euler rates: each rate
spins about its gimbal axis, *as it currently points in space*:

    ω_s = ψ̇ ẑ  +  θ̇ Rz(ψ) ŷ  +  φ̇ Rz(ψ) Ry(θ) x̂    =   E(ψ, θ) · [ψ̇, θ̇, φ̇]

At θ = ±π/2 the roll axis Rz(ψ)Ry(θ)x̂ = (0, 0, ∓1) is parallel to ẑ, so two
columns of E are parallel and E loses rank. You can check E against the truth
numerically: `[ω_s] = Ṙ Rᵀ` (from lab 01, step 5).

This is your first **singularity**: a configuration where a map from
"parameter rates" to "real velocity" loses rank. Module 3 finds the same thing
in a robot arm's Jacobian.

## Task

Implement `euler_zyx_to_matrix`, `is_gimbal_locked`, `matrix_to_euler_zyx`,
`euler_rate_matrix`, `gimbal_lock_demo`.

    python -m labs.manipulators check lab02
    python -m labs.manipulators visual lab02    # plot: smallest singular value of E vs pitch
