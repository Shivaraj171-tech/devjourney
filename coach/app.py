"""Textual side pane: ``python -m coach app`` (needs ``pip install textual``).

Written against Textual 8.2 (App/compose/BINDINGS/set_interval, Static with
markup disabled so code with [brackets] shows as-is). Polls the cards file
once a second, shows the newest card, number keys answer, n/p browse.
"""

from __future__ import annotations

from pathlib import Path

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import VerticalScroll
from textual.widgets import Footer, Header, Static

from coach import config
from coach.cli import render_card, render_result
from coach.state import State
from coach.storage import read_json, read_jsonl


class CoachApp(App):
    TITLE = "Coach"
    CSS = """
    #card { padding: 1 2; }
    #result { padding: 0 2 1 2; }
    #status { padding: 0 2; color: $text-muted; }
    """
    BINDINGS = [
        Binding("1", "answer(0)", "1", show=False),
        Binding("2", "answer(1)", "2", show=False),
        Binding("3", "answer(2)", "3", show=False),
        Binding("4", "answer(3)", "4", show=False),
        Binding("n", "move(1)", "next"),
        Binding("p", "move(-1)", "previous"),
        Binding("q", "quit", "quit"),
    ]

    def __init__(self, home: Path | None = None, process_queue: bool = False):
        super().__init__()
        self.paths = config.paths(home).ensure()
        self.process_queue = process_queue
        self.cards: list[dict] = []
        self.index = -1
        self._mtime = None

    def compose(self) -> ComposeResult:
        yield Header()
        with VerticalScroll():
            yield Static("Waiting for Claude to change some code…", id="card", markup=False)
            yield Static("", id="result", markup=False)
        yield Static("", id="status", markup=False)
        yield Footer()

    def on_mount(self) -> None:
        self.refresh_header()
        self.poll()
        self.set_interval(1.0, self.poll)

    @property
    def card(self) -> dict | None:
        return self.cards[self.index] if 0 <= self.index < len(self.cards) else None

    def refresh_header(self) -> None:
        st = State(self.paths.state)
        self.sub_title = f"🎓 XP {st.xp} · 🔥 {st.streak}"

    def poll(self) -> None:
        if self.process_queue and self.paths.queue.exists():
            from coach.pipeline import process
            process(self.paths.home)
        status = read_json(self.paths.status, {}) or {}
        self.query_one("#status", Static).update(str(status.get("message", "")))
        try:
            mtime = self.paths.cards.stat().st_mtime
        except OSError:
            return
        if mtime == self._mtime:
            return
        self._mtime = mtime
        was_latest = self.index == len(self.cards) - 1
        self.cards = read_jsonl(self.paths.cards)
        if self.cards and (was_latest or self.index < 0):
            self.show(len(self.cards) - 1)

    def show(self, index: int) -> None:
        self.index = index
        card = self.card
        if card is None:
            return
        st = State(self.paths.state)
        st.record_read(card)
        self.query_one("#card", Static).update(render_card(card))
        prev = st.answered(card.get("id", ""))
        result = ""
        if prev is not None:
            result = "(answered) " + render_result(card, prev["choice"], prev["correct"], 0)
        elif card.get("question_kind") not in (None, "none"):
            result = f"Press 1-{len(card.get('choices', []))} to answer."
        self.query_one("#result", Static).update(result)
        self.refresh_header()

    def action_answer(self, choice: int) -> None:
        card = self.card
        if card is None or card.get("question_kind") in (None, "none"):
            return
        if choice >= len(card.get("choices", [])):
            return
        st = State(self.paths.state)
        correct, gained = st.record_answer(card, choice)
        self.query_one("#result", Static).update(render_result(card, choice, correct, gained))
        self.refresh_header()

    def action_move(self, delta: int) -> None:
        if self.cards:
            self.show(max(0, min(len(self.cards) - 1, self.index + delta)))


def run_app(home: Path | None = None) -> int:
    CoachApp(home).run()
    return 0
