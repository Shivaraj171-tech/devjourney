// The sub-path the site is served from, e.g. "/devjourney" on GitHub Pages
// (https://<user>.github.io/devjourney/). Empty for local dev and root hosting.
// Set NEXT_PUBLIC_BASE_PATH at build time; Next.js inlines it into the bundle.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix a site-absolute path ("/monaco/vs") with the base path. */
export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}

/**
 * The public site URL, for Open Graph tags and other build-time absolute links:
 * https://shivaraj171-tech.github.io/devjourney/ on GitHub Pages (the deploy
 * sets NEXT_PUBLIC_BASE_PATH=/devjourney). Set NEXT_PUBLIC_SITE_ORIGIN to host elsewhere.
 */
export const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://shivaraj171-tech.github.io";
export const SITE_URL = `${SITE_ORIGIN}${BASE_PATH}/`;

/** The URL the learner is actually on (browser only), e.g. for "share my score". */
export function currentSiteUrl(): string {
  if (typeof window === "undefined") return SITE_URL;
  return `${window.location.origin}${BASE_PATH}/`;
}
