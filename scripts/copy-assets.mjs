// Copies browser assets that we self-host (instead of loading from a CDN)
// into public/. Runs automatically before `npm run dev` and `npm run build`.
//   - Pyodide (Python in WebAssembly)      -> public/pyodide/
//   - Monaco editor prebuilt files          -> public/monaco/vs/
//   - Our Python test runner and tracer    -> public/runner/test_runner.py, tracer.py
//   - Task-format runner (formats.yaml)    -> public/runner/formats.py
//   - Service worker (scripts/sw.template.js) -> public/sw.js, with versioned cache names
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");

function copy(from, to) {
  rmSync(join(pub, to), { recursive: true, force: true });
  mkdirSync(dirname(join(pub, to)), { recursive: true });
  cpSync(join(root, from), join(pub, to), { recursive: true });
  console.log(`copied ${from} -> public/${to}`);
}

copy("node_modules/pyodide", "pyodide");
copy("node_modules/monaco-editor/min/vs", "monaco/vs");
copy("lib/runner/test_runner.py", "runner/test_runner.py");
copy("lib/runner/tracer.py", "runner/tracer.py");
copy("lib/runner/formats.py", "runner/formats.py");

// Service worker: cache names change whenever Pyodide/Monaco are upgraded
// (package versions) or the runner files change (content hash), so a deploy
// never serves stale Python or editor files from a learner's device.
const version = (pkg) => JSON.parse(readFileSync(join(root, "node_modules", pkg, "package.json"), "utf-8")).version;
const assetsVersion = `pyodide-${version("pyodide")}_monaco-${version("monaco-editor")}`;
const runnerHash = createHash("sha256");
for (const f of ["public/runner-worker.js", "public/runner/test_runner.py", "public/runner/tracer.py", "public/runner/formats.py"]) {
  runnerHash.update(readFileSync(join(root, f)));
}
const runnerVersion = runnerHash.digest("hex").slice(0, 12);
const sw = readFileSync(join(root, "scripts", "sw.template.js"), "utf-8")
  .replace("__ASSETS_VERSION__", assetsVersion)
  .replace("__RUNNER_VERSION__", runnerVersion);
writeFileSync(join(pub, "sw.js"), sw);
console.log(`wrote public/sw.js (assets ${assetsVersion}, runner ${runnerVersion})`);
