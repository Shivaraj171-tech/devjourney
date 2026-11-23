Every Jacobian test fails, so start with the smallest one, `test_adjoint_moves_a_twist`: a frame 1 m up, spinning about its x axis. The base origin should be dragged along +y, but Byte's adjoint gives no linear velocity at all. Which block of the 6x6 multiplies w into the v rows?
---
For twists ordered (w, v): w_a = R w_b and v_a = [p] R w_b + R v_b. So the [p]R block sits in the BOTTOM-LEFT (row block v, column block w) and the top-right is zero. Byte wrote the (v, w) book's layout.
---
Rebuild `top` as R next to three zeros, and `bottom` as [p]R next to R. Then rerun: the space, body and geometric tests all use the adjoint, so they should all turn green together.
