**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-205: Write the table, don't copy it

Reading DH tables is half the skill. The other half is **writing** one for a robot nobody wrote a table for yet, by placing the frames yourself. Let's do it for an arm you know inside out: ticket 3's RRR arm (shoulder 0.30 m up, upper arm 0.40 m, forearm 0.30 m).
`kin/arm3_dh.py` holds `ARM3_DH`. Byte filled it in by "reading the lengths off the drawing", and the arm in the 3D view grows straight up like a flagpole. The tests compare your table, frame by frame, with `rrr_fk` from ticket 3, which we trust.
Don't guess numbers until they pass: place the frames first (the lesson's recipe), then read each row off.
