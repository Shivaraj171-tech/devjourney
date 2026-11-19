import { defineConfig, devices } from "@playwright/test";

// End-to-end tests for the static export (out/) served by a plain HTTP server,
// exactly like production. Python runs for real in Pyodide inside Chromium.
//
//   npm run e2e                  # builds once, serves out/, runs every spec
//   E2E_SKIP_BUILD=1 npm run e2e # reuse an existing out/ (after `npm run build`)
//
// Always run with `--trace off` (the npm script does).
const PORT = Number(process.env.E2E_PORT ?? 4173);
const skipBuild = process.env.E2E_SKIP_BUILD === "1";

export default defineConfig({
  testDir: "./e2e",
  // Each spec uses its own browser context (fresh localStorage), but Pyodide is
  // CPU heavy; keep parallelism modest so timeouts stay meaningful.
  fullyParallel: false,
  workers: process.env.CI ? 1 : 2,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "off",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  outputDir: "test-results/e2e",
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        launchOptions: process.env.E2E_CHROMIUM_PATH ? { executablePath: process.env.E2E_CHROMIUM_PATH } : {},
      },
    },
  ],
  webServer: {
    command: `${skipBuild ? "" : "npm run build && "}python3 -m http.server ${PORT} --bind 127.0.0.1 -d out`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: "ignore",
    stderr: "ignore",
  },
});
