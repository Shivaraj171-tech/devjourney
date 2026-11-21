"""Status line, plain CLI renderer, and (if Textual is installed) the side pane."""

import asyncio
import io
import json
import unittest

from coach_test_utils import TempHome, good_card

from coach import config, statusline
from coach.cli import main as cli_main, render_card, render_result
from coach.state import State
from coach.storage import append_jsonl

try:
    import textual  # noqa: F401
    HAVE_TEXTUAL = True
except ImportError:
    HAVE_TEXTUAL = False


def stored_card(**kw):
    c = good_card(**kw)
    c.update(id="card1", file="/p/words.py", context_label="def count_words", verified=True,
             verified_output="{'a': 2, 'b': 1}", created_at=0)
    return c


class StatusLineTests(TempHome):
    def test_line(self):
        st = State(config.paths(self.home).state)
        st.record_read(stored_card())
        st.record_answer(stored_card(), 0)
        out = io.StringIO()
        statusline.main(self.home, stdin=io.StringIO(json.dumps({"model": {}})), stdout=out)
        self.assertEqual(out.getvalue().strip(), "🎓 XP 12 · 🔥 1 · last: dictionaries")

    def test_empty_state(self):
        out = io.StringIO()
        statusline.main(self.home, stdin=io.StringIO(""), stdout=out)
        self.assertEqual(out.getvalue().strip(), "🎓 XP 0 · 🔥 0")


class RenderTests(unittest.TestCase):
    def test_render(self):
        text = render_card(stored_card())
        self.assertIn("dictionaries · words.py (def count_words)", text)
        self.assertIn("  1) {'a': 2, 'b': 1}", text)
        self.assertIn("Correct", render_result(stored_card(), 0, True, 10))
        wrong = render_result(stored_card(), 1, False, 0)
        self.assertIn("The answer is 1)", wrong)
        self.assertIn("printed: {'a': 2, 'b': 1}", wrong)


class CliWatchTests(TempHome):
    def test_watch_once_no_cards(self):
        import contextlib
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            self.assertEqual(cli_main(["watch", "--once"]), 0)
        self.assertIn("No cards yet", out.getvalue())


@unittest.skipUnless(HAVE_TEXTUAL, "textual not installed")
class TextualAppTests(TempHome):
    def test_answer_flow(self):
        from coach.app import CoachApp
        p = config.paths(self.home).ensure()
        append_jsonl(p.cards, stored_card())

        async def scenario():
            app = CoachApp(self.home)
            async with app.run_test(size=(80, 40)) as pilot:
                await pilot.pause()
                card_text = str(app.query_one("#card").render())
                self.assertIn("dictionaries", card_text)
                await pilot.press("1")
                await pilot.pause()
                self.assertIn("Correct", str(app.query_one("#result").render()))
                self.assertIn("XP 12", app.sub_title)

        asyncio.run(scenario())
        self.assertEqual(State(p.state).xp, 12)


if __name__ == "__main__":
    unittest.main()
