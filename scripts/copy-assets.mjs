// Copies browser assets that we self-host (instead of loading from a CDN)
// into public/. Runs automatically before `npm run dev` and `npm run build`.
//   - Pyodide (Python in WebAssembly)      -> public/pyodide/
//   - Monaco editor prebuilt files          -> public/monaco/vs/
//   - Our Python test runner                -> public/runner/test_runner.py
import { cpSync, mkdirSync, rmSync } from "node:fs";
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
