`dh_transform` passes every test, so the four moves are fine. The trouble is between the table and `dh_transform`: the 0.20 m pedestal shows up as a 0.20 rad turn. Look at how `fk_dh_frames` takes each row apart.
---
The module docstring says each row is `(a, alpha, d, theta_offset)`. Compare that with the names in the `for` line: two of them are in the wrong place, so d's column is used as the angle offset and the offset column as d.
---
Rename the loop variables so they follow the table's column order. The line below them (`dh_transform(a, alpha, d, qi + offset)`) is already right once the names are.
