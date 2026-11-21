import datetime as dt
import json
import unittest

from coach_test_utils import TempHome

from coach.state import State


class StateTests(TempHome):
    def st(self, day):
        return State(self.home / "state.json", today=day)

    def test_xp_rules(self):
        d = dt.date(2026, 11, 1)
        card = {"id": "c1", "concept": "dictionaries", "answer_index": 0}
        s = self.st(d)
        self.assertEqual(s.record_read(card), 2)
        self.assertEqual(s.record_read(card), 0)  # re-reading earns nothing
        self.assertEqual(s.record_answer(card, 0), (True, 10))
        self.assertEqual(s.record_answer(card, 0), (True, 0))  # only first answer counts
        self.assertEqual(s.xp, 12)
        card2 = {"id": "c2", "concept": "loops", "answer_index": 1}
        self.assertEqual(s.record_answer(card2, 0), (False, 0))
        self.assertEqual(s.record_answer(card2, 1), (True, 0))  # not first try
        reloaded = self.st(d)
        self.assertEqual(reloaded.xp, 12)
        self.assertEqual(reloaded.data["concepts"], {"dictionaries": 1})
        self.assertEqual(reloaded.data["last_concept"], "dictionaries")

    def test_streak(self):
        d = dt.date(2026, 11, 1)
        self.st(d).record_read({"id": "a"})
        self.assertEqual(self.st(d).streak, 1)
        self.st(d).record_read({"id": "b"})
        self.assertEqual(self.st(d).streak, 1)  # same day
        self.st(d + dt.timedelta(days=1)).record_read({"id": "c"})
        self.assertEqual(self.st(d + dt.timedelta(days=1)).streak, 2)
        self.assertEqual(self.st(d + dt.timedelta(days=2)).streak, 2)  # yesterday still counts
        self.assertEqual(self.st(d + dt.timedelta(days=3)).streak, 0)  # broken
        self.st(d + dt.timedelta(days=5)).record_read({"id": "d"})
        s = self.st(d + dt.timedelta(days=5))
        self.assertEqual((s.streak, s.data["best_streak"]), (1, 2))

    def test_corrupt_file_and_atomic_write(self):
        path = self.home / "state.json"
        path.parent.mkdir(parents=True)
        path.write_text("{broken")
        s = State(path)
        self.assertEqual(s.xp, 0)
        s.record_read({"id": "x"})
        self.assertEqual(json.loads(path.read_text())["xp"], 2)
        self.assertEqual([p.name for p in path.parent.iterdir()], ["state.json"])  # no temp files left


if __name__ == "__main__":
    unittest.main()
