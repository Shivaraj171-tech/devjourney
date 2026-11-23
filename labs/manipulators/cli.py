"""`python -m labs.manipulators` — a small, gamified front end for the manipulator labs."""

from __future__ import annotations

import argparse
import importlib
import json
import sys

from labs.manipulators import progress
from labs.manipulators.catalog import (
    BADGES, HINT_COSTS, LABS, MODULE_NAMES, REVEAL_AFTER_FAILS, Lab, find_lab, rank,
)
from labs.manipulators.runner import run_lab_tests

USE_COLOR = sys.stdout.isatty()


def c(text, code):
    return f"\033[{code}m{text}\033[0m" if USE_COLOR else str(text)


def mujoco_version():
    try:
        import mujoco
        return mujoco.__version__
    except ImportError:
        return None


# ---------------------------------------------------------------- views

def cmd_status(_args=None) -> int:
    data = progress.load()
    mj = mujoco_version()
    print(c("DevJourney · Robot Manipulators · laptop labs", "1"))
    print(f"XP {c(data['xp'], '1;33')} · rank {c(rank(data['xp']), '1;36')} · "
          f"badges {len(data['badges'])}/{len(BADGES)} · "
          f"MuJoCo {c(mj, '32') if mj else c('not installed (sim tests skipped)', '33')}")
    module = None
    for i, lab in enumerate(LABS, 1):
        if lab.module != module:
            module = lab.module
            print(c(f"\nModule {module} · {MODULE_NAMES[module]}", "1"))
        st = data["labs"].get(lab.key, {})
        if st.get("passed"):
            mark = c("✔", "32")
        elif st.get("checks"):
            mark = c("…", "33")
        else:
            mark = "·"
        extra = []
        if st.get("checks"):
            extra.append(f"{st['checks']} checks")
        if st.get("hints_used"):
            extra.append(f"{st['hints_used']} hints")
        if st.get("revealed"):
            extra.append("revealed")
        sim = " [sim]" if lab.needs_mujoco else ""
        print(f"  {mark} {i:>2}. {lab.key}  {lab.title:<42}{lab.xp:>4} XP{sim}"
              f"  {c(', '.join(extra), '2') if extra else ''}")
    if data["badges"]:
        print(c("\nBadges", "1"))
        for b in data["badges"]:
            print(f"  ★ {BADGES[b]}")
    print("\nCommands: show <lab> · check <lab> · hint <lab> · visual <lab> · status · reset")
    return 0


def cmd_show(args) -> int:
    lab = find_lab(args.lab)
    if args.reveal:
        return reveal(lab, args.yes)
    print((lab.path / "README.md").read_text())
    print(c(f"Your code: {lab.path / 'starter.py'}", "36"))
    return 0


def reveal(lab: Lab, yes: bool = False) -> int:
    data = progress.load()
    st = progress.lab_state(data, lab.key)
    if not st["passed"] and st["failed_checks"] < REVEAL_AFTER_FAILS:
        left = REVEAL_AFTER_FAILS - st["failed_checks"]
        print(f"The solution unlocks after {REVEAL_AFTER_FAILS} failed checks "
              f"({left} to go). Try `hint {lab.key}` first.")
        return 1
    if not st["passed"] and not st["revealed"]:
        print(c(f"Revealing now means passing {lab.key} later earns 0 XP.", "33"))
        if not (yes or confirm("Reveal the solution?")):
            return 1
        st["revealed"] = True
        progress.log(data, "reveal", lab=lab.key)
        progress.save(data)
    print((lab.path / "solution.py").read_text())
    return 0


def confirm(question: str) -> bool:
    if not sys.stdin.isatty():
        print("(non-interactive: pass --yes to confirm)")
        return False
    return input(f"{question} [y/N] ").strip().lower() in ("y", "yes")


def load_hints(lab: Lab) -> list[str]:
    path = lab.path / "hints.json"
    return json.loads(path.read_text()) if path.exists() else []


def cmd_hint(args) -> int:
    lab = find_lab(args.lab)
    hints = load_hints(lab)
    data = progress.load()
    st = progress.lab_state(data, lab.key)
    used = st["hints_used"]
    for i in range(used):  # hints already bought are free to re-read
        print(c(f"Hint {i + 1}:", "36"), hints[i])
    if used >= len(hints):
        print("No more hints. After "
              f"{REVEAL_AFTER_FAILS} failed checks you can run `show {lab.key} --reveal`.")
        return 0
    cost = HINT_COSTS[min(used, len(HINT_COSTS) - 1)]
    if st["passed"]:
        cost = 0
    print(f"Hint {used + 1}/{len(hints)} costs {cost} XP (you have {data['xp']}).")
    if not (args.yes or confirm("Buy it?")):
        return 1
    paid = progress.spend(data, cost)
    st["hints_used"] = used + 1
    progress.log(data, "hint", lab=lab.key, stage=used + 1, xp=-paid)
    progress.save(data)
    print(c(f"Hint {used + 1}:", "36"), hints[used])
    return 0


def cmd_check(args) -> int:
    lab = find_lab(args.lab)
    print(f"Checking {lab.key} · {lab.title} …")
    res = run_lab_tests(lab, "starter", extra_args=["-x"] if args.first else [])
    if args.verbose or (res.errors and not res.messages):
        print(res.output)
    for name, msg in res.messages:
        print(c("  ✘ ", "31") + f"{name}: {msg}")
    for name, msg in res.skip_reasons:
        print(c("  ~ ", "33") + f"{name}: skipped ({msg})")
    if res.all_skipped:
        print(c(f"All {lab.key} tests were skipped: this lab needs MuJoCo "
                "(pip install -r labs/manipulators/requirements.txt). Not counted.", "33"))
        return 1
    data = progress.load()
    mujoco_ran = lab.needs_mujoco and res.skipped == 0
    gained, badges = progress.record_check(data, lab.key, res.ok, res.summary(), lab.xp, mujoco_ran)
    progress.save(data)
    st = data["labs"][lab.key]
    if res.ok:
        print(c(f"✔ {lab.key} passed ({res.summary()}, {res.seconds:.1f}s)", "1;32"))
        if gained:
            print(c(f"  +{gained} XP → {data['xp']} XP ({rank(data['xp'])})", "1;33"))
        elif st.get("revealed") and st["xp_awarded"] == 0:
            print("  (solution was revealed earlier: no XP, but the lab counts as complete)")
        for b in badges:
            print(c(f"  ★ New badge: {BADGES[b]}", "1;35"))
        if res.skipped:
            print(c("  Some tests were skipped (MuJoCo missing?). Install it to earn the sim badges.",
                    "33"))
        return 0
    print(c(f"✘ {res.summary()} ({res.seconds:.1f}s). Failed checks so far: {st['failed_checks']}",
            "31"))
    print("  Tips: `check <lab> -v` for full tracebacks · `hint <lab>` for a nudge"
          + (f" · `show {lab.key} --reveal` is now unlocked"
             if st["failed_checks"] >= REVEAL_AFTER_FAILS else ""))
    return 1


def cmd_visual(args) -> int:
    lab = find_lab(args.lab)
    if not (lab.path / "visual.py").exists():
        print(f"{lab.key} has no visual. Labs with one: "
              + ", ".join(lb.key for lb in LABS if (lb.path / "visual.py").exists()))
        return 1
    try:
        import matplotlib  # noqa: F401
    except ImportError:
        print("matplotlib is optional and not installed: pip install matplotlib")
        return 1
    target = "solution" if args.solution else "starter"
    if args.solution and not progress.lab_state(progress.load(), lab.key)["passed"]:
        print("`--solution` is available once you've passed the lab.")
        return 1
    mod = importlib.import_module(f"labs.manipulators.{lab.folder}.{target}")
    visual = importlib.import_module(f"labs.manipulators.{lab.folder}.visual")
    outdir = progress.home() / "plots"
    outdir.mkdir(parents=True, exist_ok=True)
    try:
        path = visual.main(mod, outdir)
    except NotImplementedError as exc:
        print(f"Finish the TODOs first ({exc}).")
        return 1
    except ImportError as exc:  # e.g. the lab 25/26/28 plots run MuJoCo
        print(f"This plot needs an optional package that isn't installed ({exc.name}): "
              "pip install -r labs/manipulators/requirements.txt")
        return 1
    print(f"Saved {path}")
    return 0


def cmd_reset(args) -> int:
    if not (args.yes or confirm(f"Delete all progress in {progress.progress_path()}?")):
        return 1
    progress.save(progress.empty())
    print("Progress reset.")
    return 0


def interactive() -> int:
    cmd_status()
    if not sys.stdin.isatty():
        return 0
    while True:
        try:
            choice = input("\nLab number (or q): ").strip()
        except EOFError:
            return 0
        if choice.lower() in ("q", "quit", ""):
            return 0
        try:
            lab = find_lab(choice)
        except KeyError as exc:
            print(exc)
            continue
        action = input(f"{lab.key}: [r]ead · [c]heck · [h]int · [v]isual: ").strip().lower()[:1]
        ns = argparse.Namespace(lab=lab.key, reveal=False, yes=False, first=False, verbose=False,
                                solution=False)
        {"r": cmd_show, "c": cmd_check, "h": cmd_hint, "v": cmd_visual}.get(
            action, lambda _ns: print("?"))(ns)


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="python -m labs.manipulators",
                                description="Gamified robot-manipulator labs (numpy + MuJoCo).")
    sub = p.add_subparsers(dest="cmd")
    sub.add_parser("status", help="progress, XP and badges").set_defaults(fn=cmd_status)
    sub.add_parser("list", help="same as status").set_defaults(fn=cmd_status)
    s = sub.add_parser("show", help="print a lab's README (or --reveal the solution)")
    s.add_argument("lab")
    s.add_argument("--reveal", action="store_true",
                   help=f"show solution.py (only after {REVEAL_AFTER_FAILS} failed checks)")
    s.add_argument("-y", "--yes", action="store_true")
    s.set_defaults(fn=cmd_show)
    s = sub.add_parser("check", help="run the lab's tests against your starter.py, earn XP")
    s.add_argument("lab")
    s.add_argument("-x", "--first", action="store_true", help="stop at the first failure")
    s.add_argument("-v", "--verbose", action="store_true", help="print full pytest output")
    s.set_defaults(fn=cmd_check)
    s = sub.add_parser("hint", help="next staged hint (costs XP; re-reading is free)")
    s.add_argument("lab")
    s.add_argument("-y", "--yes", action="store_true")
    s.set_defaults(fn=cmd_hint)
    s = sub.add_parser("visual", help="save a PNG plot made with your code (needs matplotlib)")
    s.add_argument("lab")
    s.add_argument("--solution", action="store_true", help="use the reference (after passing)")
    s.set_defaults(fn=cmd_visual)
    s = sub.add_parser("reset", help="wipe progress")
    s.add_argument("-y", "--yes", action="store_true")
    s.set_defaults(fn=cmd_reset)
    args = p.parse_args(argv)
    if not getattr(args, "fn", None):
        return interactive()
    try:
        return args.fn(args)
    except KeyError as exc:
        print(exc.args[0])
        return 2
