// Human-friendly names for the concept slugs in ticket.yaml (`new_concept`).
// Pure data, no imports, so node can unit-test it.

const LABELS: Record<string, string> = {
  strings: "Strings",
  numbers: "Numbers",
  conditionals: "Conditionals (if / else)",
  loops: "Loops",
  lists: "Lists",
  dictionaries: "Dictionaries",
  functions: "Functions",
  "boolean-logic": "Boolean logic (and / or / not)",
  classes: "Classes",
  json: "JSON",
  "reading-code": "Reading code",
  "mutable-shared-data": "Mutable shared data",
  "side-effects": "Side effects",
  tracebacks: "Reading tracebacks",
  "code-review": "Code review",
  "reviewing-diffs": "Reviewing diffs",
  "writing-tests": "Writing tests",
  security: "Security",
  performance: "Performance",
  refactoring: "Refactoring",
  regressions: "Regressions",
  "hallucinated-apis": "Hallucinated APIs",
  "verifying-ai-claims": "Verifying AI claims",
  "test-first-verification": "Test-first verification",
  "specs-and-context": "Specs and context",
  "try-except": "try / except, done right",
  "while-loops": "while loops",
  "string-methods": "Slicing and string methods",
  "nested-data": "Nested data",
  "tuples-and-sorting": "Tuples and sorting",
  "scope-creep": "Scope creep",
  // Robotics Lab (side floor)
  "forward-kinematics": "Forward kinematics",
  "inverse-kinematics": "Inverse kinematics",
  "joint-limits": "Joint limits and reachability",
  trajectories: "Trajectories",
  "pid-control": "PID control",
  "q-learning": "Q-learning (reinforcement learning)",
  "logistic-regression": "Logistic regression (and data leaks)",
  "neural-networks": "Tiny neural networks (MLP)",
  // Manipulators · Module 1: rigid-body motion (side floor)
  "rotation-2d": "2D rotation matrices",
  "matrix-composition": "Matrix products and the order of turns",
  "rotation-matrices-3d": "3D rotations (orthonormal, det +1)",
  "euler-angles": "Euler angles and gimbal lock",
  "axis-angle": "Axis-angle (Rodrigues' formula)",
  quaternions: "Quaternions",
  slerp: "Slerp (blending orientations)",
  "homogeneous-transforms": "Homogeneous transforms (4x4)",
  "frame-chains": "Frames of reference and transform chains",
  "pose-chains": "Debugging a pose chain",
  "rigid-body-motion": "Rigid-body motion (module check)",
};

/** "mutable-shared-data" → "Mutable shared data". Unknown slugs are tidied, labels pass through. */
export function conceptLabel(slug: string): string {
  if (LABELS[slug]) return LABELS[slug];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return slug;
  const words = slug.replace(/-/g, " ");
  return words[0].toUpperCase() + words.slice(1);
}
