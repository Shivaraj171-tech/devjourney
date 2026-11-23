**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-204: The pedestal that became an angle

Writing a new `*_links` function for every robot doesn't scale. Since 1955 roboticists have described arms with **Denavit-Hartenberg (DH) parameters**: four numbers per joint, one table per robot. Every datasheet we'll ever get, including the six-joint arm we're buying, comes as a DH table.
`kin/dh.py` turns a table into frames. Each row is `(a, alpha, d, theta_offset)` and `dh_transform` builds the row's 4x4 (that part is fine, the single-parameter tests pass). But on our test arm, a two-link arm standing on a 0.20 m pedestal, `fk_dh` puts the tip on the floor and turned sideways by about 11°. Hmm, 0.20 m, 0.20 rad...
The 3D view shows one DH row built step by step, then the pedestal arm from your frames.
