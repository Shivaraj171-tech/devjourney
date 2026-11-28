For "how many solutions" questions, draw the triangle shoulder-elbow-target, or for the 6-DOF arm count the choices: shoulder, elbow, wrist. For numerical questions, write the step: J dq = e, with e pointing at the target.
---
For damping and clamping questions, think in singular values: Newton multiplies by 1/σ, DLS by σ / (σ² + λ²), and the clamp scales the whole step so its biggest joint is MAX_STEP.
---
If a question stalls you, go back to the lesson of the ticket it names. The section after the opening picture has the maths, and the example below it runs in the editor.
