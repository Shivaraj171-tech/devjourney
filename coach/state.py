"""XP, daily streak and concepts seen, stored in ``<COACH_HOME>/state.json``.

Rules: +2 XP the first time you read a card, +10 XP when your first answer to
a card's question is correct. The streak counts consecutive days with any
coach activity. All writes are atomic (temp file + rename).
"""

from __future__ import annotations

import datetime as _dt
from pathlib import Path

from coach.storage import atomic_write_json, read_json

XP_READ = 2
XP_CORRECT_FIRST_TRY = 10
MAX_TRACKED_IDS = 1000


def _empty() -> dict:
    return {"xp": 0, "streak": 0, "best_streak": 0, "last_active": None,
            "concepts": {}, "last_concept": None, "read": [], "answered": {}}


class State:
    def __init__(self, path: Path, today: _dt.date | None = None):
        self.path = Path(path)
        self._today = today
        data = read_json(self.path, None)
        self.data = _empty()
        if isinstance(data, dict):
            self.data.update({k: v for k, v in data.items() if k in self.data})

    def today(self) -> _dt.date:
        return self._today or _dt.date.today()

    @property
    def xp(self) -> int:
        return int(self.data["xp"])

    @property
    def streak(self) -> int:
        """Current streak; 0 if the last active day is before yesterday."""
        last = self.data.get("last_active")
        if not last:
            return 0
        try:
            gap = (self.today() - _dt.date.fromisoformat(last)).days
        except ValueError:
            return 0
        return int(self.data["streak"]) if gap <= 1 else 0

    def _touch(self) -> None:
        today = self.today()
        last = self.data.get("last_active")
        try:
            gap = (today - _dt.date.fromisoformat(last)).days if last else None
        except ValueError:
            gap = None
        if gap == 0:
            pass
        elif gap == 1:
            self.data["streak"] = int(self.data["streak"]) + 1
        else:
            self.data["streak"] = 1
        self.data["last_active"] = today.isoformat()
        self.data["best_streak"] = max(int(self.data["best_streak"]), int(self.data["streak"]))

    def save(self) -> None:
        self.data["read"] = self.data["read"][-MAX_TRACKED_IDS:]
        answered = self.data["answered"]
        if len(answered) > MAX_TRACKED_IDS:
            self.data["answered"] = dict(list(answered.items())[-MAX_TRACKED_IDS:])
        atomic_write_json(self.path, self.data)

    def record_read(self, card: dict) -> int:
        """Returns XP gained (0 if this card was already read)."""
        cid = card.get("id")
        self._touch()
        gained = 0
        if cid and cid not in self.data["read"]:
            self.data["read"].append(cid)
            gained = XP_READ
            concept = card.get("concept")
            if concept:
                self.data["concepts"][concept] = int(self.data["concepts"].get(concept, 0)) + 1
                self.data["last_concept"] = concept
        self.data["xp"] = self.xp + gained
        self.save()
        return gained

    def record_answer(self, card: dict, choice: int) -> tuple[bool, int]:
        """Returns (correct, xp_gained). Only the first answer can earn XP."""
        cid = card.get("id") or ""
        correct = choice == card.get("answer_index")
        self._touch()
        gained = 0
        if cid not in self.data["answered"]:
            self.data["answered"][cid] = {"choice": choice, "correct": correct}
            if correct:
                gained = XP_CORRECT_FIRST_TRY
        self.data["xp"] = self.xp + gained
        self.save()
        return correct, gained

    def answered(self, card_id: str) -> dict | None:
        return self.data["answered"].get(card_id)
