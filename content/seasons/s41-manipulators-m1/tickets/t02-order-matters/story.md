**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-102: A tiny matrix helper (and one turn too many)

Up on the shelves Grabby turns boxes in 3D, and 3D turns are 3x3 matrices. There's no numpy in the browser, so we're writing our own tiny helper, `rigid/mat.py`: a matrix is a list of rows, and that's it. `identity`, `transpose` and `mat_vec` are done. `matmul` is still a TODO: that one's yours.
Then there's `then(first, second)`: "turn the box by `first`, then by `second`". Byte wrote that one, and on the flat table every box came out right. On the shelves the box ends up lying on the wrong face.
The 3D view plays the two turns one after the other. Once `matmul` works, watch where the box ends compared with the dashed target.
