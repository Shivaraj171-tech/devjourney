"""Tiny test runner for ticket tests. Uses only the standard library.

A ticket's tests are plain functions named `test_*` that use `assert`.
This runner imports every `test_*.py` file in a tests folder, calls each
test function, and reports pass / fail / error for each one.

It is deliberately small and pytest-free, so the same file can later be
loaded inside Pyodide in the browser (Milestone 2).

Command-line use (prints JSON to stdout):
    python3 test_runner.py <code_dir> <tests_dir>
"""

import contextlib
import importlib.util
import io
import json
import sys
import traceback
from pathlib import Path


def _load_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _short_traceback(exc):
    """Traceback text without the runner's own frames."""
    tb = exc.__traceback__
    # Skip frames that belong to this runner file.
    while tb is not None and tb.tb_frame.f_code.co_filename == __file__:
        tb = tb.tb_next
    return "".join(traceback.format_exception(type(exc), exc, tb))


def run_tests(code_dir, tests_dir):
    """Run every test in tests_dir with code_dir importable.

    Returns a dict:
        {
          "passed": bool,          # True only if there was >=1 test and all passed
          "results": [ {"file", "name", "status", "message", "traceback", "output"} ],
        }
    status is "pass", "fail" (assertion failed) or "error" (any other exception,
    including failing to import the test file). "output" is anything the
    code printed while that test ran.
    """
    code_dir = str(Path(code_dir).resolve())
    sys.path.insert(0, code_dir)
    results = []
    try:
        for test_file in sorted(Path(tests_dir).glob("test_*.py")):
            module_name = f"_ticket_tests_{test_file.stem}"
            printed = io.StringIO()
            try:
                with contextlib.redirect_stdout(printed):
                    module = _load_module(test_file, module_name)
            except Exception as exc:  # noqa: BLE001 - learner code can raise anything
                results.append({
                    "file": test_file.name,
                    "name": "(import)",
                    "status": "error",
                    "message": f"{type(exc).__name__}: {exc}",
                    "traceback": _short_traceback(exc),
                    "output": printed.getvalue(),
                })
                continue

            for name in list(vars(module)):  # definition order
                func = getattr(module, name)
                if not (name.startswith("test_") and callable(func)):
                    continue
                result = {"file": test_file.name, "name": name,
                          "status": "pass", "message": "", "traceback": ""}
                printed = io.StringIO()
                try:
                    with contextlib.redirect_stdout(printed):
                        func()
                except AssertionError as exc:
                    result.update(status="fail", message=str(exc) or "assertion failed",
                                  traceback=_short_traceback(exc))
                except Exception as exc:  # noqa: BLE001
                    result.update(status="error", message=f"{type(exc).__name__}: {exc}",
                                  traceback=_short_traceback(exc))
                result["output"] = printed.getvalue()
                results.append(result)
    finally:
        sys.path.remove(code_dir)

    passed = bool(results) and all(r["status"] == "pass" for r in results)
    return {"passed": passed, "results": results}


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: test_runner.py <code_dir> <tests_dir>", file=sys.stderr)
        sys.exit(2)
    print(json.dumps(run_tests(sys.argv[1], sys.argv[2])))
