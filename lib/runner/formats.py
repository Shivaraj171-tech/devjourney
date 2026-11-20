"""Runs the small Python programs behind the extra task formats (formats.yaml).

Shared by the browser (public/runner-worker.js loads it into Pyodide) and the
content validator (scripts/validate_content.py runs it with python3), so the
app and the validator always judge an answer the same way.

    predict   run a short snippet and capture what it prints
    break_it  run Byte's function on the learner's input, then the spec check
    parsons   run the learner's assembled lines, then the check code

Every function returns a plain dict (JSON-safe). Learner code never raises out
of here: errors come back as {"error": "...", "error_type": "..."}.

Command line (used by the validator): a JSON request on stdin, e.g.
    {"kind": "break_it", "code": "...", "call": "f({input})", "check": "...", "input": "1, 2"}
prints the JSON result.
"""

import ast
import contextlib
import copy
import io
import json
import sys
import traceback

# Where learner-visible snippets "live" in tracebacks.
SNIPPET_FILE = "<snippet>"


def normalize_output(text):
    """Printed output, ignoring trailing spaces and blank lines at the ends."""
    lines = [line.rstrip() for line in str(text).replace("\r\n", "\n").split("\n")]
    return "\n".join(lines).strip("\n")


def _short_error(exc):
    """'ZeroDivisionError: division by zero', or the syntax error with its line."""
    if isinstance(exc, SyntaxError):
        return f"SyntaxError: {exc.msg} (line {exc.lineno})"
    text = str(exc)
    return f"{type(exc).__name__}: {text}" if text else type(exc).__name__


def _exec(source, namespace, stdout):
    """exec source with print() going to stdout. Returns (error, error_type) or (None, None)."""
    try:
        code = compile(source, SNIPPET_FILE, "exec")
        with contextlib.redirect_stdout(stdout):
            exec(code, namespace)
    except (Exception, SystemExit) as exc:  # noqa: BLE001 - learner code can raise anything
        return _short_error(exc), type(exc).__name__
    return None, None


def _fresh_namespace():
    return {"__name__": "__main__", "__builtins__": __builtins__}


def run_snippet(code):
    """Run code; return what it printed and the error (if any)."""
    out = io.StringIO()
    error, error_type = _exec(code, _fresh_namespace(), out)
    return {"stdout": out.getvalue(), "error": error, "error_type": error_type}


def parse_args(text):
    """The learner's input ("1000, 3") as a tuple of Python literals, or raise ValueError.

    Only literals are allowed (numbers, strings, lists, tuples, dicts, True/False/None),
    so an input can't run code or reach into the check.
    """
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Type at least one value.")
    try:
        value = ast.literal_eval(f"({text},)")
    except (ValueError, SyntaxError, TypeError, MemoryError, RecursionError):
        raise ValueError("Use plain Python values separated by commas, e.g. 1000, 3 or \"Ana\".") from None
    return value


def _fill(template, name):
    """'split_bill({input})' -> 'split_bill(*__args)'."""
    return template.replace("{input}", f"*{name}")


def break_it(code, call, check, input, helpers="", crash_counts=False):  # noqa: A002 - matches the YAML field
    """Run Byte's function on input and check its result against the spec.

    status:
      - "broken":  the spec check is False on Byte's result (a counterexample!),
                   or Byte's code crashed and crash_counts is true
      - "holds":   Byte's result meets the spec for this input
      - "invalid": the input can't be parsed, or the spec check itself can't judge it
      - "crashed": Byte's code raised and crashes don't count for this task
    """
    try:
        args = parse_args(input)
    except ValueError as exc:
        return {"status": "invalid", "message": str(exc), "result": None, "stdout": ""}

    out = io.StringIO()
    ns = _fresh_namespace()
    error, _ = _exec(code + "\n" + (helpers or ""), ns, out)
    if error:
        return {"status": "invalid", "message": f"The task's code failed to load: {error}", "result": None, "stdout": out.getvalue()}

    ns["__args"] = copy.deepcopy(args)
    try:
        with contextlib.redirect_stdout(out):
            result = eval(compile(_fill(call, "__args"), SNIPPET_FILE, "eval"), ns)  # noqa: S307
    except (Exception, SystemExit) as exc:  # noqa: BLE001
        message = f"Byte's code crashed: {_short_error(exc)}"
        return {"status": "broken" if crash_counts else "crashed", "message": message, "result": None, "stdout": out.getvalue()}

    ns["__args"] = copy.deepcopy(args)  # Byte's function may have changed its inputs
    ns["result"] = result
    try:
        with contextlib.redirect_stdout(out):
            ok = eval(compile(_fill(check, "__args"), SNIPPET_FILE, "eval"), ns)  # noqa: S307
    except (Exception, SystemExit) as exc:  # noqa: BLE001
        return {"status": "invalid", "message": f"The spec can't judge that input ({_short_error(exc)}).",
                "result": repr(result), "stdout": out.getvalue()}
    status = "holds" if ok else "broken"
    return {"status": status, "message": "", "result": repr(result), "stdout": out.getvalue()}


def parsons(program, check, expected_output=None):
    """Run the assembled lines, then the check code (asserts), in one namespace.

    passed is true when nothing raised and (if expected_output is given) the
    printed output matches it.
    """
    out = io.StringIO()
    try:
        compile(program, SNIPPET_FILE, "exec")
    except SyntaxError as exc:
        return {"passed": False, "stdout": "", "error": _short_error(exc), "error_type": "SyntaxError"}
    error, error_type = _exec(program + "\n\n" + (check or ""), _fresh_namespace(), out)
    stdout = out.getvalue()
    if error:
        return {"passed": False, "stdout": stdout, "error": error, "error_type": error_type}
    if expected_output is not None and normalize_output(stdout) != normalize_output(expected_output):
        return {"passed": False, "stdout": stdout, "error": "The printed output isn't what was expected.",
                "error_type": "OutputMismatch"}
    return {"passed": True, "stdout": stdout, "error": None, "error_type": None}


def handle(request):
    """Dispatch one request dict (see the module docstring)."""
    kind = request.get("kind")
    if kind == "predict":
        return run_snippet(request["code"])
    if kind == "break_it":
        return break_it(request["code"], request["call"], request["check"], request["input"],
                        request.get("helpers") or "", bool(request.get("crash_counts")))
    if kind == "parsons":
        return parsons(request["program"], request.get("check") or "", request.get("expected_output"))
    return {"error": f"unknown kind {kind!r}"}


def handle_json(request_json):
    """JSON in, JSON out (what the web worker calls)."""
    try:
        return json.dumps(handle(json.loads(request_json)))
    except Exception:  # noqa: BLE001 - report harness bugs instead of crashing the worker
        return json.dumps({"error": "internal: " + traceback.format_exc(limit=2)})


if __name__ == "__main__":
    sys.stdout.write(handle_json(sys.stdin.read()))
