**From:** Rosa (Robotics Engineer)
**Ticket:** MAN-410: Module 4 concept check ✅

Tote 9 is cleared. Grabby-6 now reaches #414's replacement box exactly and simply reports "1 cm out of reach" for the ones that slide too far, without a single wild swing. You built its inverse kinematics from counting solutions to a production solver: the law of cosines, the base-plane split, the wrist centre, Newton on positions and on full poses with a body twist, damped least squares, the choice between solutions, and the guard rails at the edge.
Before Module 5 (trajectories: how to get from here to there smoothly, not just where to end up), let's make sure the ideas stuck. No new bug: read `ik/` if you like, then answer the questions in the Quiz tab. A few practice puzzles too.
Three questions answer almost everything: "how many solutions should there be?", "what does each Newton step solve?" and "what keeps the step sane?".
