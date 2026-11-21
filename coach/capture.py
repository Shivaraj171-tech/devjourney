"""Claude Code hook entry point: ``python /path/to/coach/capture.py``.

Handles three hook events (from the JSON Claude Code sends on stdin):

* ``PreToolUse`` for ``Write``: snapshot the file as it is now, because the
  PostToolUse payload for Write only carries the new content.
* ``PostToolUse`` for ``Edit``/``Write``: append a change event (before and
  after text) to ``<COACH_HOME>/queue.jsonl``.
* ``Stop``: if the queue has work, start ``python -m coach process`` as a
  detached background process and return at once.

Contract with Claude Code: print nothing to stdout, always exit 0, never take
long. Any error goes to ``<COACH_HOME>/errors.log``.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path

if __package__ in (None, ""):  # run as a script from a hook command
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from coach import config  # noqa: E402
from coach.grounding import MAX_FILE_BYTES, is_sensitive_path, looks_binary, looks_secret  # noqa: E402
from coach.storage import append_jsonl, log_error  # noqa: E402

MAX_STDIN = 4_000_000
SNAPSHOT_TTL = 3600  # seconds


def _snapshot_key(session_id: str, tool_use_id: str | None, file_path: str) -> str:
    raw = f"{session_id}|{tool_use_id or ''}|{file_path}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def _resolve(file_path: str, cwd: str | None) -> str:
    p = Path(file_path)
    if not p.is_absolute() and cwd:
        p = Path(cwd) / p
    return str(p)


def _read_text(path: str) -> tuple[str | None, str | None]:
    """Returns (text, skip_reason)."""
    try:
        size = os.path.getsize(path)
    except OSError:
        return None, "missing"
    if size > MAX_FILE_BYTES:
        return None, "too large"
    try:
        with open(path, "rb") as fh:
            data = fh.read(MAX_FILE_BYTES + 1)
    except OSError:
        return None, "unreadable"
    if b"\x00" in data[:8192]:
        return None, "binary"
    return data.decode("utf-8", errors="replace"), None


def _cleanup_snapshots(snap_dir: Path) -> None:
    now = time.time()
    try:
        for p in snap_dir.iterdir():
            try:
                if now - p.stat().st_mtime > SNAPSHOT_TTL:
                    p.unlink()
            except OSError:
                pass
    except OSError:
        pass


def handle_pre_write(payload: dict, paths: config.Paths) -> None:
    tool_input = payload.get("tool_input") or {}
    file_path = tool_input.get("file_path")
    if not isinstance(file_path, str) or not file_path:
        return
    file_path = _resolve(file_path, payload.get("cwd"))
    if is_sensitive_path(file_path):
        return
    paths.ensure()
    exists = os.path.exists(file_path)
    content, reason = _read_text(file_path) if exists else (None, None)
    snap = {"file_path": file_path, "exists": exists, "content": content,
            "skipped": reason, "ts": time.time()}
    sid = str(payload.get("session_id") or "")
    for key in {_snapshot_key(sid, payload.get("tool_use_id"), file_path),
                _snapshot_key(sid, None, file_path)}:
        (paths.snapshots / f"{key}.json").write_text(json.dumps(snap), encoding="utf-8")
    _cleanup_snapshots(paths.snapshots)


def _pop_snapshot(payload: dict, file_path: str, paths: config.Paths) -> dict | None:
    sid = str(payload.get("session_id") or "")
    found = None
    for key in (_snapshot_key(sid, payload.get("tool_use_id"), file_path),
                _snapshot_key(sid, None, file_path)):
        p = paths.snapshots / f"{key}.json"
        if p.exists():
            if found is None:
                try:
                    found = json.loads(p.read_text(encoding="utf-8"))
                except (OSError, ValueError):
                    found = None
            try:
                p.unlink()
            except OSError:
                pass
    return found


def build_change(payload: dict, paths: config.Paths) -> dict | None:
    tool = payload.get("tool_name")
    tool_input = payload.get("tool_input") or {}
    if not isinstance(tool_input, dict):
        return None
    file_path = tool_input.get("file_path")
    if not isinstance(file_path, str) or not file_path:
        return None
    file_path = _resolve(file_path, payload.get("cwd"))
    if is_sensitive_path(file_path):
        return None

    if tool == "Edit":
        old = tool_input.get("old_string")
        new = tool_input.get("new_string")
        if not isinstance(old, str) or not isinstance(new, str):
            return None
        after, reason = _read_text(file_path)
        if after is None or new not in after:
            return None  # file changed again already, or unreadable: skip
        if tool_input.get("replace_all"):
            before = after.replace(new, old) if new else None
        else:
            before = after.replace(new, old, 1)
        if before is None:
            return None
        before_known = True
    elif tool == "Write":
        after = tool_input.get("content")
        if not isinstance(after, str):
            return None
        if len(after.encode("utf-8", "ignore")) > MAX_FILE_BYTES or looks_binary(after):
            _pop_snapshot(payload, file_path, paths)
            return None
        snap = _pop_snapshot(payload, file_path, paths)
        if snap is None:
            before, before_known = "", False  # no snapshot: treat as new content
        elif not snap.get("exists"):
            before, before_known = "", True
        elif isinstance(snap.get("content"), str):
            before, before_known = snap["content"], True
        else:
            return None  # old file was binary/too large
    else:
        return None

    if looks_secret(before) or looks_secret(after):
        return None
    return {
        "type": "change",
        "tool": tool,
        "file_path": file_path,
        "cwd": payload.get("cwd"),
        "session_id": payload.get("session_id"),
        "tool_use_id": payload.get("tool_use_id"),
        "ts": time.time(),
        "before": before,
        "after": after,
        "before_known": before_known,
    }


def spawn_processor(paths: config.Paths) -> bool:
    """Start ``python -m coach process`` detached. Returns True if started."""
    try:
        if not paths.queue.exists() or paths.queue.stat().st_size == 0:
            return False
    except OSError:
        return False
    root = str(Path(__file__).resolve().parent.parent)
    env = dict(os.environ)
    env["PYTHONPATH"] = root + (os.pathsep + env["PYTHONPATH"] if env.get("PYTHONPATH") else "")
    kwargs: dict = {
        "cwd": root, "env": env, "stdin": subprocess.DEVNULL,
        "stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL, "close_fds": True,
    }
    if os.name == "nt":  # pragma: no cover
        kwargs["creationflags"] = 0x00000008 | 0x00000200  # DETACHED_PROCESS | NEW_PROCESS_GROUP
    else:
        kwargs["start_new_session"] = True
    subprocess.Popen([sys.executable, "-m", "coach", "process", "--quiet"], **kwargs)
    return True


def handle(raw: str, home: Path | None = None) -> None:
    paths = config.paths(home)
    try:
        payload = json.loads(raw)
    except ValueError:
        log_error(paths.errors, "capture: stdin was not JSON")
        return
    if not isinstance(payload, dict):
        log_error(paths.errors, "capture: stdin JSON was not an object")
        return
    event = payload.get("hook_event_name")
    tool = payload.get("tool_name")
    if event == "PreToolUse" and tool == "Write":
        handle_pre_write(payload, paths)
    elif event == "PostToolUse" and tool in ("Edit", "Write"):
        change = build_change(payload, paths)
        if change is not None:
            paths.ensure()
            append_jsonl(paths.queue, change)
    elif event == "Stop":
        if config.load_settings(home).autoprocess:
            spawn_processor(paths)


def main(stdin=None, home: Path | None = None) -> int:
    real_stdout = sys.stdout
    try:
        sys.stdout = open(os.devnull, "w")  # nothing we do may reach Claude
    except OSError:
        pass
    try:
        src = stdin if stdin is not None else sys.stdin
        raw = src.read(MAX_STDIN) if src is not None else ""
        handle(raw or "", home)
    except BaseException as exc:  # noqa: BLE001 - must never crash the hook
        try:
            log_error(config.paths(home).errors, "capture: unexpected error", exc)
        except BaseException:
            pass
    finally:
        if sys.stdout is not real_stdout:
            try:
                sys.stdout.close()
            except Exception:
                pass
            sys.stdout = real_stdout
    return 0


if __name__ == "__main__":
    main()
    sys.exit(0)
