"""Step-through tracer for the in-browser debugger. Uses only the standard library.

Runs ONE test function with sys.settrace and records a timeline of the steps
taken inside the learner's code (files under code_dir). Test-file frames are
not recorded as steps, but their function names appear in each step's call
stack so the learner can see which check called their code.

Used inside Pyodide by public/runner-worker.js (message type "trace") and
tested with CPython in scripts/tests/test_tracer.py.

Command-line use (prints JSON to stdout):
    python3 tracer.py <code_dir> <tests_dir> <test_file> <test_name>
"""

import contextlib
import importlib.util
import io
import json
import reprlib
import sys
import traceback
import types
from pathlib import Path

MAX_STEPS = 300
MAX_VARS = 15
MAX_REPR = 80
MAX_STDOUT = 4000

_repr = reprlib.Repr()
_repr.maxstring = MAX_REPR
_repr.maxother = MAX_REPR
_repr.maxlist = _repr.maxtuple = _repr.maxset = _repr.maxdict = 12
_repr.maxlevel = 3

_SKIP_TYPES = (types.ModuleType, types.FunctionType, types.BuiltinFunctionType, types.MethodType, type)


class StepLimitReached(BaseException):
    """Raised from the trace function to stop code that runs for too many steps.

    A BaseException so that learner code with `except Exception:` can't swallow it.
    """


def short_repr(value):
    """repr() that never fails and is at most MAX_REPR characters long."""
    try:
        text = _repr.repr(value)
    except Exception as exc:  # noqa: BLE001 - a learner's __repr__ can raise anything
        text = f"<{type(value).__name__} (repr failed: {type(exc).__name__})>"
    if len(text) > MAX_REPR:
        text = text[: MAX_REPR - 1] + "…"
    return text


def visible_locals(frame_locals):
    """[[name, short repr], ...] for the variables a beginner cares about."""
    out = []
    for name, value in frame_locals.items():
        if name.startswith("__") or isinstance(value, _SKIP_TYPES):
            continue
        out.append([name, short_repr(value)])
        if len(out) >= MAX_VARS:
            break
    return out


def _load_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _short_traceback(exc):
    """Traceback text without this file's own frames."""
    tb = exc.__traceback__
    while tb is not None and tb.tb_frame.f_code.co_filename == __file__:
        tb = tb.tb_next
    return "".join(traceback.format_exception(type(exc), exc, tb))


class _Recorder:
    def __init__(self, code_dir, tests_dir, stdout, max_steps):
        self.code_prefix = code_dir.rstrip("/") + "/"
        self.tests_prefix = tests_dir.rstrip("/") + "/"
        self.stdout = stdout
        self.max_steps = max_steps
        self.steps = []
        self.truncated = False
        self.frame_ids = {}  # live learner frame -> small integer id
        self.next_frame_id = 1
        self.unwinding = set()  # frame ids an exception is currently leaving
        self.seen_exceptions = set()  # id() of exceptions already reported as raised

    def is_learner(self, frame):
        return frame.f_code.co_filename.startswith(self.code_prefix)

    def stack(self, frame):
        """Function names from the test function down to `frame` (outermost first)."""
        names = []
        f = frame
        while f is not None:
            filename = f.f_code.co_filename
            if filename.startswith(self.code_prefix) or filename.startswith(self.tests_prefix):
                names.append(f.f_code.co_name)
            f = f.f_back
        names.reverse()
        return names

    def record(self, frame, event, **extra):
        if len(self.steps) >= self.max_steps:
            self.truncated = True
            raise StepLimitReached()
        printed = self.stdout.getvalue()
        if len(printed) > MAX_STDOUT:
            printed = "…" + printed[-MAX_STDOUT:]
        step = {
            "file": frame.f_code.co_filename[len(self.code_prefix):],
            "line": frame.f_lineno,
            "func": frame.f_code.co_name,
            "frame": self.frame_ids[frame],
            "event": event,
            "locals": visible_locals(frame.f_locals),
            "stdout": printed,
            "stack": self.stack(frame),
        }
        step.update(extra)
        self.steps.append(step)

    # Global trace function: called on every new frame.
    def on_call(self, frame, event, arg):
        if event != "call" or not self.is_learner(frame):
            return None  # don't trace test, runner or stdlib frames line by line
        self.frame_ids[frame] = self.next_frame_id
        self.next_frame_id += 1
        self.record(frame, "call")
        return self.on_local

    # Local trace function: line / return / exception events in a learner frame.
    def on_local(self, frame, event, arg):
        fid = self.frame_ids.get(frame)
        if fid is None:
            return None
        if event == "line":
            self.unwinding.discard(fid)  # an except block caught it
            self.record(frame, "line")
        elif event == "return":
            if fid in self.unwinding:
                self.unwinding.discard(fid)
                self.record(frame, "unwind")
            else:
                self.record(frame, "return", value=short_repr(arg))
            del self.frame_ids[frame]
        elif event == "exception":
            exc_type, exc, _tb = arg
            if exc_type in (StopIteration, GeneratorExit, StepLimitReached):
                return self.on_local
            raised_here = id(exc) not in self.seen_exceptions
            self.seen_exceptions.add(id(exc))
            self.unwinding.add(fid)
            self.record(frame, "exception", exception=f"{exc_type.__name__}: {exc}" if str(exc) else exc_type.__name__,
                        raised_here=raised_here)
        return self.on_local


def trace_test(code_dir, tests_dir, test_file, test_name, max_steps=MAX_STEPS):
    """Run one test function under sys.settrace.

    Returns a dict:
        {
          "file": test_file, "name": test_name,
          "status": "pass" | "fail" | "error" | "stopped",
          "message": str, "traceback": str, "output": str,
          "steps": [ {file, line, func, frame, event, locals, stdout, stack, ...} ],
          "truncated": bool,        # True if stopped after max_steps
        }
    event is "call", "line", "return" (with "value"), "exception" (with
    "exception" and "raised_here") or "unwind" (the frame is left because of an
    exception). Paths in "file" are relative to code_dir.
    """
    code_dir = str(Path(code_dir).resolve())
    tests_dir = str(Path(tests_dir).resolve())
    result = {"file": test_file, "name": test_name, "status": "pass", "message": "",
              "traceback": "", "output": "", "steps": [], "truncated": False}
    printed = io.StringIO()
    recorder = _Recorder(code_dir, tests_dir, printed, max_steps)
    sys.path.insert(0, code_dir)
    try:
        try:
            with contextlib.redirect_stdout(printed):
                module = _load_module(str(Path(tests_dir) / test_file), f"_ticket_tests_{Path(test_file).stem}")
            func = getattr(module, test_name, None)
            if not callable(func):
                raise LookupError(f"no check called {test_name} in {test_file}")
            # Only trace the call itself, not loading the test file.
            printed.seek(0)
            printed.truncate()
            with contextlib.redirect_stdout(printed):
                sys.settrace(recorder.on_call)
                try:
                    func()
                finally:
                    sys.settrace(None)
        except StepLimitReached:
            result.update(status="stopped",
                          message=f"Stopped after {max_steps} steps. Is there a loop that never ends?")
        except AssertionError as exc:
            result.update(status="fail", message=str(exc) or "assertion failed", traceback=_short_traceback(exc))
        except BaseException as exc:  # noqa: BLE001 - learner code can raise anything, even SystemExit
            result.update(status="error", message=f"{type(exc).__name__}: {exc}", traceback=_short_traceback(exc))
    finally:
        sys.settrace(None)
        sys.path.remove(code_dir)
    result["output"] = printed.getvalue()
    result["steps"] = recorder.steps
    result["truncated"] = recorder.truncated
    return result


if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("usage: tracer.py <code_dir> <tests_dir> <test_file> <test_name>", file=sys.stderr)
        sys.exit(2)
    print(json.dumps(trace_test(*sys.argv[1:])))
