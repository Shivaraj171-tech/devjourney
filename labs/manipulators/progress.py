"""Progress, XP and badges, stored as JSON in ~/.devjourney-labs/ (override: DEVJOURNEY_LABS_HOME)."""

from __future__ import annotations

import json
import os
import tempfile
import time
from pathlib import Path

from labs.manipulators.catalog import BADGES, LABS

VERSION = 1


def home() -> Path:
    return Path(os.environ.get("DEVJOURNEY_LABS_HOME", Path.home() / ".devjourney-labs"))


def progress_path() -> Path:
    return home() / "manipulators-progress.json"


def empty() -> dict:
    return {"version": VERSION, "xp": 0, "labs": {}, "badges": [], "history": []}


def load() -> dict:
    try:
        data = json.loads(progress_path().read_text())
        if data.get("version") == VERSION:
            return data
    except (OSError, ValueError):
        pass
    return empty()


def save(data: dict) -> None:
    path = progress_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".progress-", suffix=".json")
    with os.fdopen(fd, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, path)


def lab_state(data: dict, key: str) -> dict:
    return data["labs"].setdefault(key, {
        "checks": 0, "failed_checks": 0, "passed": False, "hints_used": 0,
        "revealed": False, "last": None, "xp_awarded": 0,
    })


def log(data: dict, event: str, **fields) -> None:
    data["history"].append({"t": time.strftime("%Y-%m-%dT%H:%M:%S"), "event": event, **fields})
    data["history"] = data["history"][-200:]


def spend(data: dict, amount: int) -> int:
    """Deduct XP (never below 0). Returns what was actually deducted."""
    paid = min(amount, data["xp"])
    data["xp"] -= paid
    return paid


def record_check(data: dict, key: str, passed: bool, summary: str, xp_value: int,
                 mujoco_ran: bool) -> tuple[int, list[str]]:
    """Update state after a check. Returns (xp gained, newly earned badges)."""
    st = lab_state(data, key)
    st["checks"] += 1
    st["last"] = summary
    gained = 0
    if not passed:
        st["failed_checks"] += 1
        log(data, "check", lab=key, passed=False, summary=summary)
        return 0, []
    first_pass = not st["passed"]
    st["passed"] = True
    if first_pass:
        gained = 0 if st["revealed"] else xp_value
        st["xp_awarded"] = gained
        st["first_try"] = st["checks"] == 1
        st["mujoco_ran"] = mujoco_ran
        data["xp"] += gained
    elif mujoco_ran and not st.get("mujoco_ran"):
        st["mujoco_ran"] = True
    log(data, "check", lab=key, passed=True, summary=summary, xp=gained)
    return gained, award_badges(data)


def award_badges(data: dict) -> list[str]:
    labs = data["labs"]
    passed = {k for k, v in labs.items() if v.get("passed")}
    earned = set()
    if passed:
        earned.add("first-light")
    if any(v.get("first_try") for v in labs.values()):
        earned.add("first-try")
    if sum(1 for v in labs.values() if v.get("passed") and v.get("hints_used") == 0
           and not v.get("revealed")) >= 3:
        earned.add("purist")
    for module, badge in ((1, "frame-wrangler"), (2, "chain-forger"), (3, "jacobian-whisperer"),
                          (4, "pose-hunter"), (5, "smooth-operator"), (6, "equations-of-motion")):
        if all(lab.key in passed for lab in LABS if lab.module == module):
            earned.add(badge)
    for key, badge in (("lab08", "sim-validated"), ("lab11", "straight-shooter"),
                       ("lab19", "torque-matched"), ("lab20", "digital-twin")):
        if labs.get(key, {}).get("passed") and labs[key].get("mujoco_ran"):
            earned.add(badge)
    if all(lab.key in passed for lab in LABS):
        earned.add("graduate")
    new = sorted(b for b in earned if b in BADGES and b not in data["badges"])
    data["badges"].extend(new)
    return new
