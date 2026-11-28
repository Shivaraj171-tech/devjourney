**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-410: Module 4 concept check

Tote 9 is cleared. Grabby-6 reaches #414's replacement box exactly, and for the ones that slide too far it reports "1 cm out of reach" without a single wild swing. You built its inverse kinematics from counting solutions to a production solver: the law of cosines, the base-plane split, the wrist centre, Newton on positions and on full poses with a body twist, damped least squares, the choice between solutions, and the guard rails at the edge.
Module 5 is trajectories: how to get from here to there smoothly, not only where to end up. First, a check on the ideas. No bug. Read `ik/` if you want, then answer the questions in the Quiz tab. A few practice puzzles too.
Three questions answer most of it: "how many solutions should there be?", "what does each Newton step solve?" and "what keeps the step sane?".
