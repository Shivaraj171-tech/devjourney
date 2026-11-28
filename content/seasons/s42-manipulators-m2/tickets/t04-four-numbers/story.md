**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-204: The pedestal that became an angle

A new `*_links` function for every robot doesn't scale. Since 1955 roboticists have described arms with **Denavit-Hartenberg (DH) parameters**: four numbers per joint, one table per robot. Every datasheet we get, including the six-joint arm we're buying, comes as a DH table.
`kin/dh.py` turns a table into frames. Each row is `(a, alpha, d, theta_offset)`, and `dh_transform` builds the row's 4x4 (its single-parameter tests pass). On our test arm, a two-link arm on a 0.20 m pedestal, `fk_dh` puts the tip on the floor, turned sideways by about 11°.
The 3D view builds one DH row step by step, then draws the pedestal arm from your frames.
