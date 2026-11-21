"""Paths and settings for the coach.

Everything lives under one data directory (default ``~/.claude-coach``,
override with the ``COACH_HOME`` environment variable). Settings come from,
in order of priority: environment variables, then ``<COACH_HOME>/config.json``,
then the defaults below.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

# The research doc (docs/research/coach-oss.md) recommends Qwen3.5-9B. The tag
# below is our best guess at its Ollama name and has NOT been checked against
# ollama.com. Check the exact tag (and the licence on the model card) before you
# pull, and set COACH_MODEL or "model" in config.json if it differs.
DEFAULT_MODEL = "qwen3.5:9b"
DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434"


def coach_home() -> Path:
    raw = os.environ.get("COACH_HOME")
    return Path(raw).expanduser() if raw else Path.home() / ".claude-coach"


@dataclass(frozen=True)
class Paths:
    home: Path

    @property
    def queue(self) -> Path:
        return self.home / "queue.jsonl"

    @property
    def snapshots(self) -> Path:
        return self.home / "snapshots"

    @property
    def cards(self) -> Path:
        return self.home / "cards.jsonl"

    @property
    def rejected(self) -> Path:
        return self.home / "rejected.jsonl"

    @property
    def state(self) -> Path:
        return self.home / "state.json"

    @property
    def status(self) -> Path:
        return self.home / "status.json"

    @property
    def errors(self) -> Path:
        return self.home / "errors.log"

    @property
    def lock(self) -> Path:
        return self.home / "process.lock"

    @property
    def config(self) -> Path:
        return self.home / "config.json"

    def ensure(self) -> "Paths":
        self.home.mkdir(parents=True, exist_ok=True)
        self.snapshots.mkdir(parents=True, exist_ok=True)
        return self


def paths(home: Path | None = None) -> Paths:
    return Paths(Path(home) if home else coach_home())


@dataclass(frozen=True)
class Settings:
    model: str = DEFAULT_MODEL
    ollama_url: str = DEFAULT_OLLAMA_URL
    timeout: float = 120.0  # seconds; a cold model load can be slow
    temperature: float = 0.2
    num_ctx: int = 8192
    think: bool = False  # ask thinking models to answer directly
    max_cards_per_run: int = 1  # at most one card per Claude turn
    max_attempts_per_run: int = 3  # LLM calls per turn before giving up
    allow_why: bool = False  # "why" questions can't be machine-checked
    sandbox: str = "auto"  # auto | bwrap | none
    autoprocess: bool = True  # Stop hook starts the processor in the background


def _truthy(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}


def load_settings(home: Path | None = None) -> Settings:
    data: dict = {}
    cfg = paths(home).config
    try:
        if cfg.is_file():
            loaded = json.loads(cfg.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                data = loaded
    except (OSError, ValueError):
        data = {}

    env = os.environ
    mapping = {
        "model": ("COACH_MODEL", str),
        "ollama_url": ("COACH_OLLAMA_URL", str),
        "timeout": ("COACH_TIMEOUT", float),
        "temperature": ("COACH_TEMPERATURE", float),
        "num_ctx": ("COACH_NUM_CTX", int),
        "think": ("COACH_THINK", _truthy),
        "max_cards_per_run": ("COACH_MAX_CARDS", int),
        "max_attempts_per_run": ("COACH_MAX_ATTEMPTS", int),
        "allow_why": ("COACH_ALLOW_WHY", _truthy),
        "sandbox": ("COACH_SANDBOX", str),
        "autoprocess": ("COACH_AUTOPROCESS", _truthy),
    }
    kwargs = {}
    defaults = Settings()
    for field, (env_name, conv) in mapping.items():
        value = env.get(env_name)
        try:
            if value is not None:
                kwargs[field] = conv(value)
            elif field in data:
                raw = data[field]
                if conv is _truthy:
                    kwargs[field] = raw if isinstance(raw, bool) else _truthy(str(raw))
                else:
                    kwargs[field] = conv(raw)
        except (TypeError, ValueError):
            kwargs[field] = getattr(defaults, field)
    return Settings(**kwargs)
