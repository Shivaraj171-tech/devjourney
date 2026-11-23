Only the x coordinate of the home pose is off, and by exactly its sign: +0.817 instead of -0.817. At home, which rows of the table add up to the x coordinate? The lesson's Step 3 writes the home pose as sums of table entries.
---
At home x = a2 + a3. Byte's comment says "lengths are positive", but a is a signed distance along x_i, and UR put x2 and x3 pointing back along the arm, so the datasheet's a2 and a3 are negative.
---
Restore the datasheet's signs in rows 2 and 3 (and fix Byte's comment). Then check the home pose by hand from the table before you run the tests: does a2 + a3 give the documented x?
