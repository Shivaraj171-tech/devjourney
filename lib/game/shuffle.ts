// Stable "random" order for answer choices, so the correct answer isn't always
// in the same place. Deterministic per seed (e.g. ticket id + question number),
// so the order doesn't jump around between visits.

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/** A permutation of 0..n-1 (indices into the original choices). */
export function shuffledOrder(n: number, seed: string): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  let state = hash(seed) || 1;
  for (let i = n - 1; i > 0; i--) {
    // xorshift32
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    const j = state % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
