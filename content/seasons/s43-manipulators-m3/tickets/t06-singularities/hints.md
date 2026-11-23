Two separate bugs, one per file. For `det`: the failing case is [[0, 1], [1, 0]], whose determinant is -1. Elimination can't start with a 0 pivot, so it swaps the rows. What does a row swap do to a determinant?
---
`det` swaps rows without flipping `sign` (the lesson's Step 2). For `singularity_kinds`: the wrist factor of det J is sin(q5), the joint between 4 and 6, but Byte's wrist test reads q4.
---
In `det`, flip `sign` whenever two rows are swapped. In `singularity_kinds`, test the angle that really appears in the wrist factor. Then predict, before running: which kinds should the home pose report?
