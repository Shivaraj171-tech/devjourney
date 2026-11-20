import type { NextConfig } from "next";

// Fully static site: every page is generated at build time from content/,
// and all learner state lives in the browser. No server needed.
const nextConfig: NextConfig = {
  output: "export",
  // Sub-path hosting (GitHub Pages serves this repo at /devjourney). Empty locally.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  trailingSlash: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
