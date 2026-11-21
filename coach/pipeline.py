"""Queue -> grounding -> LLM -> validation -> execution check -> cards.jsonl.

Run by ``python -m coach process`` (the Stop hook starts it in the background)
or by the UI. Only one processor runs at a time (a lock file); a second one
exits immediately. When anything is uncertain, no card is written.
"""

from __future__ import annotations

import json
import os
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field
from pathlib import Path

from coach import config
from coach.cards import CARD_SCHEMA, validate_card
from coach.grounding import Grounding, GroundingSkip, ground
from coach.llm import LLMError, LLMUnavailable, build_messages
from coach.storage import append_jsonl, claim_file, log_error, read_jsonl, write_status
from coach.verify import verify_card

try:
    import fcntl  # type: ignore
except ImportError:  # pragma: no cover
    fcntl = None  # type: ignore

STALE_LOCK_SECONDS = 600


@dataclass
class RunReport:
    events: int = 0
    candidates: int = 0
    cards: list[dict] = field(default_factory=list)
    rejected: list[dict] = field(default_factory=list)
    status: str = ""
    locked_out: bool = False


@contextmanager
def process_lock(path: Path):
    """Yields True if we got the lock."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if fcntl is not None:
        fh = open(path, "a+")
        try:
            try:
                fcntl.flock(fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError:
                yield False
                return
            try:
                yield True
            finally:
                fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
        finally:
            fh.close()
        return
    # Windows fallback: exclusive create with stale-lock detection.  # pragma: no cover
    try:
        if path.exists() and time.time() - path.stat().st_mtime > STALE_LOCK_SECONDS:
            path.unlink()
        fd = os.open(str(path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except OSError:
        yield False
        return
    try:
        os.write(fd, str(os.getpid()).encode())
        yield True
    finally:
        os.close(fd)
        try:
            path.unlink()
        except OSError:
            pass


def claim_events(p: config.Paths) -> list[dict]:
    """Move the queue (and leftovers from crashed runs) aside and read them."""
    p.ensure()
    leftovers = sorted(p.home.glob("queue.processing-*.jsonl"))
    mine = p.home / f"queue.processing-{os.getpid()}-{uuid.uuid4().hex[:8]}.jsonl"
    files = list(leftovers)
    if p.queue.exists() and claim_file(p.queue, mine):
        files.append(mine)
    events: list[dict] = []
    for f in files:
        events.extend(e for e in read_jsonl(f) if e.get("type") == "change")
        try:
            f.unlink()
        except OSError:
            pass
    return events


def merge_by_file(events: list[dict]) -> list[dict]:
    """Several edits to one file in one turn become one change (first before,
    last after), so the card sees the whole turn's change to that file."""
    merged: dict[str, dict] = {}
    order: list[str] = []
    for e in sorted(events, key=lambda e: e.get("ts", 0)):
        fp = e.get("file_path")
        if not isinstance(fp, str):
            continue
        if fp not in merged:
            merged[fp] = dict(e)
            order.append(fp)
        else:
            merged[fp]["after"] = e.get("after")
            merged[fp]["ts"] = e.get("ts")
    return [merged[fp] for fp in order]


def _score(g: Grounding) -> float:
    """Prefer medium-sized changes: big enough to teach, small enough to focus."""
    n = len(g.added) + len(g.removed)
    return -abs(n - 12) + (5 if g.language == "python" else 0)


def _parse(text: str):
    try:
        return json.loads(text)
    except ValueError:
        # tolerate a fenced reply even though format=schema should prevent it
        t = text.strip()
        if t.startswith("```"):
            t = t.strip("`")
            t = t[t.find("{"):] if "{" in t else t
            try:
                return json.loads(t)
            except ValueError:
                return None
        return None


def make_card(g: Grounding, llm, settings: config.Settings) -> tuple[dict | None, list[str]]:
    raw = llm.complete(build_messages(g), CARD_SCHEMA)
    parsed = _parse(raw)
    if parsed is None:
        return None, ["reply was not JSON"]
    card, errs = validate_card(parsed, g, allow_why=settings.allow_why)
    if card is None:
        return None, errs
    verdict = verify_card(card, sandbox=settings.sandbox)
    if not verdict.keep:
        return None, [verdict.reason + (f" (actual output: {verdict.actual[:80]!r})" if verdict.actual else "")]
    card["verified"] = card["question_kind"] == "predict_output"
    card["verified_output"] = verdict.actual if card["verified"] else ""
    return card, []


def process(home: Path | None = None, llm=None, settings: config.Settings | None = None) -> RunReport:
    p = config.paths(home).ensure()
    settings = settings or config.load_settings(home)
    report = RunReport()
    with process_lock(p.lock) as got:
        if not got:
            report.locked_out = True
            return report
        events = claim_events(p)
        report.events = len(events)
        if not events:
            return report
        groundings: list[Grounding] = []
        for e in merge_by_file(events):
            try:
                groundings.append(ground(e))
            except GroundingSkip:
                continue
            except Exception as exc:  # noqa: BLE001
                log_error(p.errors, f"grounding {e.get('file_path')}", exc)
        report.candidates = len(groundings)
        if not groundings:
            return report
        if llm is None:
            from coach.llm import make_llm
            llm = make_llm(settings)
        groundings.sort(key=_score, reverse=True)
        attempts = 0
        for g in groundings:
            if len(report.cards) >= settings.max_cards_per_run or attempts >= settings.max_attempts_per_run:
                break
            attempts += 1
            try:
                card, errs = make_card(g, llm, settings)
            except LLMUnavailable as exc:
                report.status = str(exc)
                write_status(p.status, report.status, "warn")
                return report
            except LLMError as exc:
                card, errs = None, [str(exc)]
            except Exception as exc:  # noqa: BLE001
                log_error(p.errors, f"make_card {g.file_path}", exc)
                card, errs = None, [f"internal error: {type(exc).__name__}"]
            if card is None:
                rec = {"ts": time.time(), "file": g.file_path, "reasons": errs}
                report.rejected.append(rec)
                append_jsonl(p.rejected, rec)
                continue
            card.update({
                "id": uuid.uuid4().hex[:12],
                "created_at": time.time(),
                "file": g.file_path,
                "context_label": g.context_label,
                "language": g.language,
            })
            append_jsonl(p.cards, card)
            report.cards.append(card)
        if report.cards:
            report.status = f"new card: {report.cards[-1]['concept'].replace('_', ' ')}"
            write_status(p.status, report.status, "info")
        elif not report.status:
            report.status = "no card this turn (nothing passed the checks)"
            write_status(p.status, report.status, "info")
    return report
