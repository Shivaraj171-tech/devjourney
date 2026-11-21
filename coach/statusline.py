"""Claude Code status line: prints e.g. "🎓 XP 120 · 🔥 3 · last: dictionaries".

Configured as ``"statusLine": {"type": "command", "command": "python .../coach/statusline.py"}``.
Claude Code sends session JSON on stdin; we don't need it, so it is drained and ignored.
"""

from __future__ import annotations

import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from coach import config  # noqa: E402
from coach.state import State  # noqa: E402
from coach.storage import read_json  # noqa: E402


def line(home: Path | None = None) -> str:
    p = config.paths(home)
    st = State(p.state)
    parts = [f"🎓 XP {st.xp}", f"🔥 {st.streak}"]
    if st.data.get("last_concept"):
        parts.append(f"last: {str(st.data['last_concept']).replace('_', ' ')}")
    status = read_json(p.status, {}) or {}
    if status.get("level") == "warn" and status.get("message"):
        parts.append(f"coach: {str(status['message'])[:60]}")
    return " · ".join(parts)


def main(home: Path | None = None, stdin=None, stdout=None) -> int:
    stdin = stdin if stdin is not None else sys.stdin
    stdout = stdout if stdout is not None else sys.stdout
    try:
        if stdin is not None and not stdin.isatty():
            stdin.read(1_000_000)
    except Exception:
        pass
    try:
        out = line(home)
    except Exception:
        out = "🎓 coach"
    try:
        stdout.write(out + "\n")
    except UnicodeEncodeError:  # e.g. a Windows console code page
        stdout.write(out.encode("ascii", "ignore").decode().strip(" ·") + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
