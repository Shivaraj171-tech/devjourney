The velocity is exactly half the right answer, at every pose. A central difference probes p(q + h q̇) and p(q - h q̇). Add a `print` of q inside `tip_velocity`, before and after each probe: is the second probe really taken from q - h q̇?
---
`step()` adds h * direction to q IN PLACE and returns the same list. So the first probe moves the caller's q forward, and the second one moves it back: it probes p(q), not p(q - h q̇). That's a forward difference divided by 2h: half the velocity. (And the caller's q is left changed.)
---
Make `step()` build and return a NEW list, q[i] + h * direction[i] for each joint, without touching q. Leave the 2h alone: once both probes are right, it is the right divisor.
