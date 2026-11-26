At q = 0 every exponential is the identity, so PoE gives M whatever the screws are: the home test can't fail. The test that names a joint is more useful: joint 1 must turn about the base's z axis through the origin, and yours comes out horizontal, 0.1625 m up. Which frame did it come from?
---
In DH, frame i-1's z axis is joint i's axis (ticket 5): z0 is joint 1, z1 joint 2, ..., z5 joint 6. `fk_dh_frames` returns [frame 0, frame 1, ..., frame 6], so the six axes are in the first six frames, not the last six.
---
Change which slice of `frames` the loop runs over so it starts at frame 0 and stops before the flange. Then think about why the flange frame (frame 6) never appears as an axis.
