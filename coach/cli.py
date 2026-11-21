"""Command line: ``python -m coach <command>``.

Commands: watch (plain-terminal side pane, no dependencies), app (Textual side
pane), process (run the pipeline once), status, doctor, statusline, install.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

from coach import config
from coach.state import State
from coach.storage import read_json, read_jsonl


def latest_card(p: config.Paths) -> dict | None:
    cards = read_jsonl(p.cards)
    return cards[-1] if cards else None


def render_card(card: dict) -> str:
    concept = str(card.get("concept", "")).replace("_", " ")
    where = Path(str(card.get("file", ""))).name
    label = card.get("context_label") or ""
    lines = [f"── {concept} · {where} ({label}) ──", "", card.get("explanation", ""), ""]
    for q in card.get("quoted_lines", []):
        lines.append(f"    │ {q}")
    if card.get("question_kind") not in (None, "none"):
        lines += ["", f"Q: {card.get('question', '')}"]
        for i, c in enumerate(card.get("choices", []), 1):
            body = c if "\n" not in c else c.replace("\n", "\n       ")
            lines.append(f"  {i}) {body}")
    return "\n".join(lines)


def render_result(card: dict, choice: int, correct: bool, gained: int) -> str:
    choices = card.get("choices", [])
    ans = card.get("answer_index", -1)
    lines = []
    if correct:
        lines.append(f"✓ Correct!{f' +{gained} XP' if gained else ''}")
    else:
        right = choices[ans] if 0 <= ans < len(choices) else "?"
        lines.append(f"✗ Not quite. The answer is {ans + 1}) {right}")
    if card.get("verified"):
        lines.append("Checked by actually running this snippet:")
        lines += [f"    {l}" for l in str(card.get("verify_snippet", "")).splitlines()]
        lines.append(f"  → printed: {card.get('verified_output', '')}")
    elif card.get("question_kind") == "spot_line":
        lines.append("(The choices are real lines from the diff.)")
    return "\n".join(lines)


def header(st: State) -> str:
    return f"🎓 XP {st.xp} · 🔥 {st.streak} day streak"


def _status_line(p: config.Paths) -> str:
    s = read_json(p.status, {}) or {}
    return str(s.get("message", ""))


def cmd_watch(args) -> int:
    p = config.paths().ensure()
    st = State(p.state)
    shown: str | None = None
    last_status = ""
    print(header(st))
    print("Waiting for Claude to change some code… (Ctrl-C to quit)")
    try:
        while True:
            if args.process and p.queue.exists():
                from coach.pipeline import process
                process()
            status = _status_line(p)
            if status and status != last_status:
                print(f"[coach] {status}")
                last_status = status
            card = latest_card(p)
            if card and card.get("id") != shown:
                shown = card.get("id")
                st = State(p.state)
                print("\n" + render_card(card))
                gained = st.record_read(card)
                if card.get("question_kind") not in (None, "none") and not st.answered(card.get("id", "")):
                    n = len(card.get("choices", []))
                    raw = input(f"\nYour answer [1-{n}, Enter to skip]: ").strip()
                    if raw.isdigit() and 1 <= int(raw) <= n:
                        correct, g2 = st.record_answer(card, int(raw) - 1)
                        print(render_result(card, int(raw) - 1, correct, g2))
                        gained += g2
                print(f"\n{header(st)}" + (f"  (+{gained} XP)" if gained else ""))
                if args.once:
                    return 0
            elif args.once:
                if not card:
                    print("No cards yet.")
                return 0
            time.sleep(args.interval)
    except (KeyboardInterrupt, EOFError):
        print()
        return 0


def cmd_process(args) -> int:
    from coach.pipeline import process
    report = process()
    if not args.quiet:
        if report.locked_out:
            print("another processor is running")
        print(f"events: {report.events}, candidates: {report.candidates}, "
              f"cards: {len(report.cards)}, rejected: {len(report.rejected)}")
        for r in report.rejected:
            print(f"  rejected {Path(r['file']).name}: {'; '.join(r['reasons'])}")
        if report.status:
            print(report.status)
    return 0


def cmd_status(args) -> int:
    p = config.paths()
    st = State(p.state)
    print(header(st))
    concepts = sorted(st.data.get("concepts", {}).items(), key=lambda kv: -kv[1])
    if concepts:
        print("concepts seen: " + ", ".join(f"{k.replace('_', ' ')} ×{v}" for k, v in concepts))
    print(f"cards: {len(read_jsonl(p.cards))}, rejected: {len(read_jsonl(p.rejected))}, "
          f"queued changes: {len(read_jsonl(p.queue))}")
    s = _status_line(p)
    if s:
        print(f"last status: {s}")
    print(f"data dir: {p.home}")
    return 0


def cmd_doctor(args) -> int:
    from coach.llm import make_llm
    from coach.verify import bwrap_works
    s = config.load_settings()
    ok, msg = make_llm(s).health()
    print(("OK   " if ok else "FAIL ") + msg)
    print(f"INFO model={s.model} url={s.ollama_url} data dir={config.paths().home}")
    print(f"INFO sandbox: {'bwrap available' if bwrap_works() else 'basic (no working bwrap)'}")
    try:
        import textual  # noqa: F401
        print("INFO textual installed: `python -m coach app` available")
    except ImportError:
        print("INFO textual not installed: use `python -m coach watch` (or pip install textual)")
    return 0 if ok else 1


def cmd_app(args) -> int:
    try:
        from coach.app import run_app
    except ImportError:
        print("Textual is not installed. Run `pip install textual`, or use `python -m coach watch`.")
        return 1
    return run_app()


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if argv and argv[0] == "install":
        from coach.install import run
        return run(argv[1:])
    if argv and argv[0] == "statusline":
        from coach.statusline import main as sl
        return sl()
    ap = argparse.ArgumentParser(prog="python -m coach")
    sub = ap.add_subparsers(dest="cmd", required=True)
    w = sub.add_parser("watch", help="plain-terminal side pane (no extra dependencies)")
    w.add_argument("--interval", type=float, default=1.0)
    w.add_argument("--once", action="store_true", help="show the latest card and exit")
    w.add_argument("--process", action="store_true", help="also process the queue here")
    w.set_defaults(fn=cmd_watch)
    a = sub.add_parser("app", help="Textual side pane (pip install textual)")
    a.set_defaults(fn=cmd_app)
    pr = sub.add_parser("process", help="turn queued changes into cards now")
    pr.add_argument("--quiet", action="store_true")
    pr.set_defaults(fn=cmd_process)
    sub.add_parser("status", help="XP, streak, counts").set_defaults(fn=cmd_status)
    sub.add_parser("doctor", help="check Ollama, the model and the sandbox").set_defaults(fn=cmd_doctor)
    sub.add_parser("install", help="print/merge Claude Code settings (see --help)")
    sub.add_parser("statusline", help="print the status line")
    args = ap.parse_args(argv)
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
