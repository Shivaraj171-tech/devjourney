"""``python -m coach install`` - show (and optionally write) the Claude Code settings.

By default this only PRINTS the JSON to add. With ``--write`` it merges the
hooks and status line into the chosen settings file: it backs the file up
first, keeps every other key, replaces only entries it added before (it finds
them by the ``coach/capture.py`` / ``coach/statusline.py`` paths in the
command), and leaves an existing non-coach status line alone unless
``--replace-statusline`` is given.
"""

from __future__ import annotations

import argparse
import copy
import json
import shutil
import sys
import time
from pathlib import Path

from coach.storage import atomic_write_json

COACH_DIR = Path(__file__).resolve().parent
STYLE_SRC = COACH_DIR / "output-styles" / "learn-with-coach.md"
MARKERS = ("capture.py", "statusline.py")


def _q(path: str) -> str:
    return f'"{path}"'


def commands(python: str | None = None, coach_dir: Path | None = None) -> dict[str, str]:
    py = python or sys.executable
    d = coach_dir or COACH_DIR
    return {
        "capture": f"{_q(py)} {_q(str(d / 'capture.py'))}",
        "statusline": f"{_q(py)} {_q(str(d / 'statusline.py'))}",
    }


def coach_settings(python: str | None = None, coach_dir: Path | None = None) -> dict:
    cmd = commands(python, coach_dir)
    cap = cmd["capture"]
    return {
        "hooks": {
            # Synchronous on purpose: the snapshot must be taken before Write runs.
            "PreToolUse": [{"matcher": "Write", "hooks": [
                {"type": "command", "command": cap, "timeout": 10}]}],
            "PostToolUse": [{"matcher": "Edit|Write", "hooks": [
                {"type": "command", "command": cap, "async": True, "timeout": 30}]}],
            "Stop": [{"hooks": [
                {"type": "command", "command": cap, "async": True, "timeout": 30}]}],
        },
        "statusLine": {"type": "command", "command": cmd["statusline"]},
    }


def _is_coach_command(command, coach_dir: Path) -> bool:
    if not isinstance(command, str):
        return False
    c = command.replace("\\", "/")
    d = str(coach_dir).replace("\\", "/")
    return any(f"{d}/{m}" in c or f"coach/{m}" in c for m in MARKERS)


def _strip_coach(groups: list, coach_dir: Path) -> list:
    out = []
    for group in groups:
        if not isinstance(group, dict) or not isinstance(group.get("hooks"), list):
            out.append(group)
            continue
        kept = [h for h in group["hooks"] if not (isinstance(h, dict) and _is_coach_command(h.get("command"), coach_dir))]
        if kept:
            g = dict(group)
            g["hooks"] = kept
            out.append(g)
    return out


def merge(existing: dict, ours: dict, *, coach_dir: Path = COACH_DIR,
          replace_statusline: bool = False, remove: bool = False) -> tuple[dict, list[str]]:
    """Pure merge. Returns (new_settings, notes)."""
    result = copy.deepcopy(existing) if existing else {}
    notes: list[str] = []
    hooks = result.get("hooks")
    if hooks is not None and not isinstance(hooks, dict):
        raise ValueError('"hooks" in the settings file is not an object')
    hooks = hooks or {}
    for event in set(hooks) | set(ours["hooks"]):
        groups = hooks.get(event, [])
        if not isinstance(groups, list):
            raise ValueError(f'"hooks.{event}" in the settings file is not a list')
        groups = _strip_coach(groups, coach_dir)
        if not remove and event in ours["hooks"]:
            groups = groups + copy.deepcopy(ours["hooks"][event])
        if groups:
            hooks[event] = groups
        else:
            hooks.pop(event, None)
    if hooks:
        result["hooks"] = hooks
    else:
        result.pop("hooks", None)

    current = result.get("statusLine")
    current_is_ours = isinstance(current, dict) and _is_coach_command(current.get("command"), coach_dir)
    if remove:
        if current_is_ours:
            result.pop("statusLine", None)
    elif current is None or current_is_ours or replace_statusline:
        result["statusLine"] = copy.deepcopy(ours["statusLine"])
    else:
        notes.append("kept your existing statusLine (use --replace-statusline to swap in the coach one)")
    return result, notes


def settings_path(args) -> Path:
    if args.user:
        return Path.home() / ".claude" / "settings.json"
    base = Path(args.project).expanduser().resolve() / ".claude"
    return base / ("settings.local.json" if args.local else "settings.json")


def backup(path: Path) -> Path | None:
    if not path.exists():
        return None
    dest = path.with_name(f"{path.name}.coach-backup-{time.strftime('%Y%m%d-%H%M%S')}")
    n = 1
    while dest.exists():
        dest = path.with_name(f"{path.name}.coach-backup-{time.strftime('%Y%m%d-%H%M%S')}-{n}")
        n += 1
    shutil.copy2(path, dest)
    return dest


def run(argv: list[str] | None = None, out=None) -> int:
    out = out or sys.stdout
    ap = argparse.ArgumentParser(prog="python -m coach install",
                                 description="Print (or with --write, merge) the Claude Code hook settings.")
    where = ap.add_mutually_exclusive_group(required=True)
    where.add_argument("--user", action="store_true", help="~/.claude/settings.json (all projects)")
    where.add_argument("--project", metavar="DIR", help="<DIR>/.claude/settings.json")
    ap.add_argument("--local", action="store_true",
                    help="with --project: use .claude/settings.local.json (not committed; recommended)")
    ap.add_argument("--write", action="store_true", help="actually merge into the settings file (backup first)")
    ap.add_argument("--remove", action="store_true", help="with --write: remove the coach entries instead")
    ap.add_argument("--replace-statusline", action="store_true")
    ap.add_argument("--with-output-style", action="store_true",
                    help="with --write: also copy the learn-with-coach output style")
    ap.add_argument("--python", help="python executable for the hook commands (default: this one)")
    args = ap.parse_args(argv)
    if args.local and not args.project:
        ap.error("--local needs --project")

    ours = coach_settings(args.python)
    target = settings_path(args)
    if not args.write:
        print(f"# Add this to {target} (or rerun with --write to merge it for you):", file=out)
        print(json.dumps(ours, indent=2), file=out)
        if args.with_output_style:
            print(f"# Output style: copy {STYLE_SRC} to {target.parent / 'output-styles'}/", file=out)
        return 0

    existing: dict = {}
    if target.exists():
        try:
            existing = json.loads(target.read_text(encoding="utf-8") or "{}")
        except ValueError:
            print(f"error: {target} is not valid JSON; fix it first (nothing was changed)", file=out)
            return 1
        if not isinstance(existing, dict):
            print(f"error: {target} is not a JSON object (nothing was changed)", file=out)
            return 1
    try:
        merged, notes = merge(existing, ours, replace_statusline=args.replace_statusline, remove=args.remove)
    except ValueError as exc:
        print(f"error: {exc} (nothing was changed)", file=out)
        return 1
    bak = backup(target)
    atomic_write_json(target, merged)
    print(f"{'removed coach entries from' if args.remove else 'updated'} {target}", file=out)
    if bak:
        print(f"backup: {bak}", file=out)
    for n in notes:
        print(f"note: {n}", file=out)
    if args.with_output_style and not args.remove:
        dest_dir = target.parent / "output-styles"
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / STYLE_SRC.name
        if dest.exists():
            print(f"note: {dest} already exists; left it alone", file=out)
        else:
            shutil.copy2(STYLE_SRC, dest)
            print(f"output style: {dest} (choose it with /output-style)", file=out)
    return 0
