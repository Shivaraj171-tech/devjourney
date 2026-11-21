"""Run a card's ``predict_output`` snippet and check the model's answer.

This is a BEST-EFFORT sandbox, not a security boundary. It only ever runs
the short snippet the LLM wrote for a card (after the static checks in
``cards.snippet_policy_errors``), never the user's project code. Layers:

* ``python -I`` (isolated mode: no user site-packages, no PYTHON* env vars,
  script dir not on sys.path), run with ``-c`` from a fresh temp directory;
* an empty environment;
* a wall-clock timeout (default 2 s) and, on Linux/macOS, ``RLIMIT_CPU``,
  ``RLIMIT_AS`` (where the OS enforces it), ``RLIMIT_FSIZE``, ``RLIMIT_NOFILE``;
* a Python audit hook that refuses sockets, subprocesses, writes via ``open``
  and file-system mutations;
* ``bwrap`` (Bubblewrap) with all namespaces unshared and a read-only root,
  when it is installed and works on this machine.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from functools import lru_cache

from coach.cards import normalise_choice, normalise_output

DEFAULT_TIMEOUT = 2.0
MAX_OUTPUT = 10_000

# Prepended to every snippet. Audit hooks can't be removed once added.
PRELUDE = r'''
import sys as _s
def _coach_guard(event, args):
    if event == "open":
        mode = args[1] if len(args) > 1 else "r"
        flags = args[2] if len(args) > 2 else 0
        if isinstance(mode, str) and any(c in mode for c in "wax+"):
            raise PermissionError("coach sandbox: writing files is blocked")
        if mode is None and isinstance(flags, int) and flags & 0o1103:
            raise PermissionError("coach sandbox: writing files is blocked")
        return
    if event.startswith(("socket.", "subprocess.", "os.exec", "os.spawn", "os.posix_spawn",
                         "os.fork", "os.system", "os.kill", "ctypes.", "shutil.",
                         "urllib.", "http.", "ftplib.", "smtplib.", "webbrowser.")):
        raise PermissionError("coach sandbox: %s is blocked" % event)
    if event in ("os.remove", "os.rename", "os.rmdir", "os.mkdir", "os.chmod", "os.chown",
                 "os.truncate", "os.link", "os.symlink", "os.utime", "os.chdir", "os.chroot",
                 "os.putenv", "os.unsetenv", "os.startfile"):
        raise PermissionError("coach sandbox: %s is blocked" % event)
_s.addaudithook(_coach_guard)
del _s, _coach_guard
'''


@dataclass
class RunResult:
    ok: bool
    stdout: str
    stderr: str
    returncode: int | None
    timed_out: bool
    sandbox: str


def _limits(cpu_seconds: int):  # pragma: no cover - runs in the child
    def apply():
        try:
            import resource
        except ImportError:
            return
        def setlim(name, value):
            lim = getattr(resource, name, None)
            if lim is None:
                return
            try:
                resource.setrlimit(lim, (value, value))
            except (ValueError, OSError):
                pass
        setlim("RLIMIT_CPU", cpu_seconds)
        setlim("RLIMIT_AS", 512 * 1024 * 1024)
        setlim("RLIMIT_FSIZE", 1024 * 1024)
        setlim("RLIMIT_NOFILE", 64)
        setlim("RLIMIT_CORE", 0)
    return apply


def _bwrap_args(workdir: str) -> list[str]:
    return ["bwrap", "--ro-bind", "/", "/", "--dev", "/dev", "--proc", "/proc",
            "--tmpfs", "/tmp", "--bind", workdir, workdir, "--chdir", workdir,
            "--unshare-all", "--die-with-parent", "--new-session", "--"]


@lru_cache(maxsize=1)
def bwrap_works() -> bool:
    if os.name != "posix" or not shutil.which("bwrap"):
        return False
    try:
        with tempfile.TemporaryDirectory() as d:
            r = subprocess.run(_bwrap_args(d) + [sys.executable, "-I", "-c", "print(1)"],
                               capture_output=True, text=True, timeout=5)
            return r.returncode == 0 and r.stdout.strip() == "1"
    except (OSError, subprocess.SubprocessError):
        return False


def run_snippet(code: str, timeout: float = DEFAULT_TIMEOUT, sandbox: str = "auto") -> RunResult:
    use_bwrap = sandbox == "bwrap" or (sandbox == "auto" and bwrap_works())
    program = PRELUDE + "\n" + code
    env = {}
    if os.name == "nt":  # pragma: no cover - Windows needs these to start Python
        for key in ("SYSTEMROOT", "SystemRoot"):
            if key in os.environ:
                env[key] = os.environ[key]
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONHASHSEED"] = "0"  # deterministic set ordering for str/bytes
    with tempfile.TemporaryDirectory(prefix="coach-run-") as workdir:
        cmd = [sys.executable, "-I", "-c", program]
        if use_bwrap:
            cmd = _bwrap_args(workdir) + cmd
        kwargs: dict = dict(cwd=workdir, env=env, stdin=subprocess.DEVNULL,
                            capture_output=True, timeout=timeout)
        if os.name == "posix":
            kwargs["preexec_fn"] = _limits(max(1, int(timeout + 0.999)))
            kwargs["start_new_session"] = True
        try:
            proc = subprocess.run(cmd, **kwargs)
        except subprocess.TimeoutExpired as exc:
            out = (exc.stdout or b"")[:MAX_OUTPUT].decode("utf-8", "replace")
            return RunResult(False, out, "timeout", None, True, "bwrap" if use_bwrap else "basic")
        except OSError as exc:
            return RunResult(False, "", str(exc), None, False, "bwrap" if use_bwrap else "basic")
    stdout = proc.stdout[:MAX_OUTPUT].decode("utf-8", "replace")
    stderr = proc.stderr[:MAX_OUTPUT].decode("utf-8", "replace")
    return RunResult(proc.returncode == 0, stdout, stderr, proc.returncode, False,
                     "bwrap" if use_bwrap else "basic")


@dataclass
class Verdict:
    keep: bool
    reason: str
    actual: str = ""


def verify_card(card: dict, timeout: float = DEFAULT_TIMEOUT, sandbox: str = "auto") -> Verdict:
    """Only predict_output cards are executed; others pass through unchanged."""
    if card.get("question_kind") != "predict_output":
        return Verdict(True, "not executable")
    result = run_snippet(card.get("verify_snippet", ""), timeout=timeout, sandbox=sandbox)
    if result.timed_out:
        return Verdict(False, "snippet timed out")
    if not result.ok:
        return Verdict(False, f"snippet failed (exit {result.returncode})")
    actual = normalise_output(result.stdout)
    if not actual:
        return Verdict(False, "snippet printed nothing")
    choices = [normalise_choice(c) for c in card.get("choices", [])]
    idx = card.get("answer_index", -1)
    if not 0 <= idx < len(choices):
        return Verdict(False, "answer index out of range", actual)
    if choices[idx] != actual:
        return Verdict(False, "model's answer disagrees with the real output", actual)
    if sum(1 for c in choices if c == actual) != 1:
        return Verdict(False, "more than one choice matches", actual)
    return Verdict(True, "verified by running the snippet", actual)
