// The sub-path the site is served from, e.g. "/devjourney" on GitHub Pages
// (https://<user>.github.io/devjourney/). Empty for local dev and root hosting.
// Set NEXT_PUBLIC_BASE_PATH at build time; Next.js inlines it into the bundle.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix a site-absolute path ("/monaco/vs") with the base path. */
export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}
