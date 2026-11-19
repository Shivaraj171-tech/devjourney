import type { NextConfig } from "next";

// Fully static site: every page is generated at build time from content/,
// and all learner state lives in the browser. No server needed.
const nextConfig: NextConfig = {
  output: "export",
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
