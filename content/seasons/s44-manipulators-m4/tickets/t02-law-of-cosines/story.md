**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-402: Elbow up, elbow down

Brute force found the two clusters. Now the two exact answers, instantly. For two links that's school geometry: the law of cosines gives the elbow angle, atan2 gives the shoulder. `ik/two_link_ik.py` should return either elbow on request. The planner picks elbow up over the conveyor and elbow down under the shelf.
Byte's version gets elbow down right and sends elbow up somewhere below the table. This morning it also refused the far box, the one Grabby can only just reach stretched out, as "out of reach". I measured it: 0.900 m from the shoulder, exactly l1 + l2.
The 3D view runs YOUR solver: elbow up onto the box, elbow down onto the same box, then stretched out to the far box.
