// Web worker that runs a ticket's tests on the learner's code with Pyodide.
// Runs off the main thread so the page stays responsive; if learner code loops
// forever, the page simply terminates this worker and starts a new one.
//
// Messages in:  { type: "run", id, files: {path: text}, tests: {path: text} }
//               { type: "trace", id, files, tests, testFile, testName }
//               { type: "snippet", id, request }  (a task-format request, see lib/runner/formats.py)
// Messages out: { type: "ready" }
//               { type: "result", id, result }   (result = test_runner.run_tests JSON; "viz" = what
//                                                 the tests drew with `from lab import viz`, lib/runner/lab.py)
//               { type: "trace", id, trace }     (trace = tracer.trace_test JSON)
//               { type: "snippet", id, result }  (result = formats.handle JSON)
//               { type: "error", id, message }

// Asset URLs are relative to this worker file, so the site works under any
// base path (e.g. GitHub Pages at /devjourney/).
import { loadPyodide } from "./pyodide/pyodide.mjs";

const SETUP = `
import json, sys, shutil, importlib
from pathlib import Path

sys.path.insert(0, "/runner")
import test_runner
import tracer
import formats

WORKSPACE = Path("/workspace")

def _is_learner_module(name, mod):
    if name.startswith("_ticket_tests_"):
        return True
    paths = [getattr(mod, "__file__", None) or ""]
    paths += list(getattr(mod, "__path__", None) or [])
    return any(str(p).startswith(str(WORKSPACE)) for p in paths)

def _prepare_workspace(payload):
    if WORKSPACE.exists():
        shutil.rmtree(WORKSPACE)
    for folder, files in (("code", payload["files"]), ("tests", payload["tests"])):
        for rel, text in files.items():
            path = WORKSPACE / folder / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
    # Forget modules from the previous run so edited code is re-imported.
    for name, mod in list(sys.modules.items()):
        if _is_learner_module(name, mod):
            del sys.modules[name]
    importlib.invalidate_caches()

def run_payload(payload_json):
    payload = json.loads(payload_json)
    _prepare_workspace(payload)
    return json.dumps(test_runner.run_tests(str(WORKSPACE / "code"), str(WORKSPACE / "tests")))

def trace_payload(payload_json):
    payload = json.loads(payload_json)
    _prepare_workspace(payload)
    return json.dumps(tracer.trace_test(str(WORKSPACE / "code"), str(WORKSPACE / "tests"),
                                        payload["testFile"], payload["testName"]))
`;

// Loading progress for the page (audit: a 5-10 s first load showed only "Starting Python…").
// Pyodide's loader has no progress callback, so this reports what is really known:
// the stage, and which of Pyodide's big files have finished downloading (Resource Timing).
const PYODIDE_FILES = ["pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"];
function progress(stage, filesDone = 0) {
  self.postMessage({ type: "progress", stage, filesDone, filesTotal: PYODIDE_FILES.length });
}
function filesDownloaded() {
  try {
    const names = performance.getEntriesByType("resource").map((e) => e.name.split("?")[0]);
    return PYODIDE_FILES.filter((f) => names.some((n) => n.endsWith("/" + f))).length;
  } catch {
    return 0;
  }
}

async function init() {
  progress("download", 0);
  let lastDone = 0;
  const poll = setInterval(() => {
    const done = filesDownloaded();
    if (done !== lastDone) progress("download", (lastDone = done));
  }, 250);
  let pyodide;
  try {
    pyodide = await loadPyodide({ indexURL: new URL("./pyodide/", self.location.href).href });
  } finally {
    clearInterval(poll);
  }
  progress("checker", PYODIDE_FILES.length);
  // Write the runner files from Python itself (avoids depending on FS APIs).
  pyodide.runPython(`from pathlib import Path\nPath("/runner").mkdir(exist_ok=True)`);
  for (const name of ["test_runner.py", "tracer.py", "formats.py", "lab.py"]) {
    const source = await (await fetch(new URL(`./runner/${name}`, self.location.href))).text();
    pyodide.runPython(`Path("/runner/${name}").write_text(${JSON.stringify(source)})`);
  }
  pyodide.runPython(SETUP);
  return pyodide;
}

const ready = init();
ready.then(
  () => self.postMessage({ type: "ready" }),
  (err) => self.postMessage({ type: "error", id: null, message: `Python failed to load: ${err}` })
);

self.onmessage = async (event) => {
  const { type, id, files, tests, testFile, testName, request } = event.data;
  if (type !== "run" && type !== "trace" && type !== "snippet") return;
  try {
    const pyodide = await ready;
    if (type === "snippet") {
      // Task formats run in their own fresh namespace: /workspace is left alone.
      const payload = JSON.stringify(JSON.stringify(request));
      const resultJson = pyodide.runPython(`formats.handle_json(${payload})`);
      self.postMessage({ type: "snippet", id, result: JSON.parse(resultJson) });
    } else if (type === "run") {
      const payload = JSON.stringify(JSON.stringify({ files, tests }));
      const resultJson = pyodide.runPython(`run_payload(${payload})`);
      self.postMessage({ type: "result", id, result: JSON.parse(resultJson) });
    } else {
      const payload = JSON.stringify(JSON.stringify({ files, tests, testFile, testName }));
      const traceJson = pyodide.runPython(`trace_payload(${payload})`);
      self.postMessage({ type: "trace", id, trace: JSON.parse(traceJson) });
    }
  } catch (err) {
    self.postMessage({ type: "error", id, message: String(err) });
  }
};
