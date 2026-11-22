"""Verify every lab: tests must FAIL (meaningfully) on starter.py and PASS on solution.py.

    python labs/manipulators/tools/verify_all.py            # from the repo root
    python labs/manipulators/tools/verify_all.py lab03 lab08

"Meaningfully" = tests are collected without errors, every non-skipped test fails on the
starter, and each failure message names a TODO or an assertion (not a crash in our plumbing).
Also enforces the < 10 s per-lab budget. Exit code 0 only if everything holds.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from labs.manipulators.catalog import LABS, find_lab  # noqa: E402
from labs.manipulators.runner import run_lab_tests  # noqa: E402

BUDGET_S = 10.0


def check(lab):
    problems = []
    sol = run_lab_tests(lab, "solution")
    sta = run_lab_tests(lab, "starter")
    if sol.all_skipped and sta.all_skipped:
        return sol, sta, None  # whole lab needs an optional dependency (MuJoCo)
    if not sol.ok:
        problems.append(f"solution: {sol.summary()}, failures {sol.messages[:3]}")
    if sta.errors:
        problems.append(f"starter: {sta.errors} collection/fixture errors {sta.messages[:3]}")
    runnable = sta.tests - sta.skipped
    if sta.failures != runnable:
        problems.append(f"starter: only {sta.failures}/{runnable} tests fail (all should)")
    vague = [m for _, m in sta.messages if "TODO" not in m and "assert" not in m.lower()
             and "Error" not in m]
    if vague:
        problems.append(f"starter: unclear failure messages {vague[:2]}")
    for name, res in (("solution", sol), ("starter", sta)):
        if res.seconds > BUDGET_S:
            problems.append(f"{name}: took {res.seconds:.1f}s (> {BUDGET_S}s)")
    return sol, sta, problems


def main(argv):
    labs = [find_lab(a) for a in argv] or LABS
    try:
        import mujoco
        print(f"MuJoCo {mujoco.__version__} available: simulator tests will run.")
    except ImportError:
        print("MuJoCo NOT installed: simulator tests will be skipped.")
    print(f"{'lab':<22}{'solution':<26}{'starter':<26}{'time (sol/sta)':<16}status")
    bad = skipped = 0
    for lab in labs:
        sol, sta, problems = check(lab)
        if problems is None:
            skipped += 1
            status = f"SKIP ({sol.skip_reasons[0][1] if sol.skip_reasons else 'skipped'})"
            problems = []
        else:
            status = "OK" if not problems else "FAIL"
        bad += bool(problems)
        sta_s = f"{sta.failures}/{sta.tests - sta.skipped} fail" + (
            f", {sta.skipped} skip" if sta.skipped else "")
        print(f"{lab.folder:<22}{sol.summary():<26}{sta_s:<26}"
              f"{sol.seconds:>5.1f}s/{sta.seconds:>4.1f}s    {status}")
        for p in problems:
            print(f"    - {p}")
    print(f"\n{len(labs) - bad - skipped}/{len(labs)} labs verified"
          + (f", {skipped} skipped (missing optional dependency)." if skipped else "."))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
