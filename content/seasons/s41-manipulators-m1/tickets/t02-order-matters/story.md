**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-102: A tiny matrix helper (and one turn too many)

On the shelves Grabby turns boxes in 3D, and 3D turns are 3x3 matrices. There's no numpy in the browser, so we write our own tiny helper, `rigid/mat.py`. A matrix is a list of rows. That's all.
`identity`, `transpose` and `mat_vec` are done. `matmul` is still a TODO. That one's yours.
Then `then(first, second)`: "turn the box by `first`, then by `second`". Byte wrote it. On the flat table every box came out right. On the shelves the box ends up lying on the wrong face.
The 3D view plays the two turns one after the other. Once `matmul` works, compare where the box ends with the dashed target.
