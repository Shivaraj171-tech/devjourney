Start with the simplest failing check: the inverse of a pure move by (0.5, -0.2, 0.1). What should undoing it be? Now look at the matrix Byte's `T_inv` returns for it (it's in the failure message): where did the (0.5, -0.2, 0.1) end up?
---
Only the 3x3 rotation part inverts by transposing. Solve p_world = R p_box + t for p_box: subtract t, then undo the turn with Rᵀ. So p_box = Rᵀ p_world - Rᵀ t: the inverse has rotation Rᵀ and translation -Rᵀ t. Not -t: the move has to be undone in the box's turned frame.
---
In `T_inv`: take T's rotation part and transpose it, take T's translation, and turn the translation with the transposed rotation. The answer is `make_T` of the transposed rotation and MINUS that turned translation. `rotation_of`, `translation_of`, `transpose`, `mat_vec` and `make_T` are all in the file or imported.
