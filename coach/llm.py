"""Local LLM client (Ollama, standard library only) plus a FakeLLM for tests.

Ollama API used (checked against github.com/ollama/ollama docs/api.md,
2026-11-21):

* ``POST /api/chat`` with ``model``, ``messages`` (role/content), ``stream:
  false``, ``format`` (a JSON schema), ``options`` (``temperature``,
  ``num_ctx``), ``keep_alive`` and, for thinking models, ``think``. The
  non-streaming reply is one object whose ``message.content`` holds the JSON
  text; errors come back as ``{"error": "..."}``.
* ``GET /api/version`` (is the server up?) and ``GET /api/tags`` (local
  models, ``models[].name``).

Nothing here was run against a real Ollama server while building v1.
"""

from __future__ import annotations

import json
import socket
import urllib.error
import urllib.request
from typing import Callable, Protocol

from coach.cards import CARD_SCHEMA, CONCEPTS
from coach.grounding import Grounding

SYSTEM_PROMPT = f"""You are a patient programming coach. A developer is watching an AI \
assistant change their code. Teach ONE concept that is visible in this change.

Rules:
- Use ONLY the code shown below. Never invent functions, variables, files or libraries.
- quoted_lines: copy 1 to 3 lines EXACTLY as they appear in the DIFF (without the +/- prefix).
- explanation: 1 to 3 short sentences, plain language, about what the quoted code does and why.
  Put code names in `backticks`. Teach; do not suggest fixes or improvements.
- concept: one of {", ".join(CONCEPTS)}.
- question_kind:
  * "predict_output": verify_snippet is a tiny self-contained Python 3 program (no input, no files,
    no network, standard library only) that reuses names and the idea from the diff and print()s
    a short result. choices are possible outputs written exactly as printed; answer_index is the
    correct one. Only for Python changes.
  * "spot_line": question asks which line does something; every choice is a line copied exactly
    from the DIFF; answer_index is the right one.
  * "why": a multiple-choice question about why the code was written this way.
  * "none": no question; choices is [] and answer_index is -1.
- choices: 2 to 4 distinct options (empty for "none"). verify_snippet is "" unless predict_output.
- If you are not sure, use question_kind "none".
Reply with JSON only."""


def build_messages(g: Grounding) -> list[dict]:
    user = (
        f"File: {g.file_path} ({g.language})\n\n"
        f"Enclosing code ({g.context_label}), after the change:\n```\n{g.context}\n```\n\n"
        f"DIFF:\n```diff\n{g.diff}\n```"
    )
    return [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user}]


class LLMUnavailable(Exception):
    """The model can't be reached. ``str(exc)`` is a one-line status for the user."""


class LLMError(Exception):
    """The model answered, but not usefully (bad JSON, server error)."""


class LLM(Protocol):
    def complete(self, messages: list[dict], schema: dict) -> str: ...


def _post_json(url: str, body: dict, timeout: float) -> dict:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST",
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 - local URL
        return json.loads(resp.read().decode("utf-8"))


def _get_json(url: str, timeout: float) -> dict:
    with urllib.request.urlopen(url, timeout=timeout) as resp:  # noqa: S310
        return json.loads(resp.read().decode("utf-8"))


def _http_error_message(exc: urllib.error.HTTPError) -> str:
    try:
        payload = json.loads(exc.read().decode("utf-8"))
        return str(payload.get("error") or exc.reason)
    except Exception:
        return str(exc.reason)


class OllamaLLM:
    def __init__(self, model: str, base_url: str = "http://127.0.0.1:11434", *,
                 timeout: float = 120.0, temperature: float = 0.2, num_ctx: int = 8192,
                 think: bool | None = False, keep_alive: str = "10m"):
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.temperature = temperature
        self.num_ctx = num_ctx
        self.think = think
        self.keep_alive = keep_alive

    def _body(self, messages: list[dict], schema: dict, think: bool | None) -> dict:
        body = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "format": schema,
            "options": {"temperature": self.temperature, "num_ctx": self.num_ctx},
            "keep_alive": self.keep_alive,
        }
        if think is not None:
            body["think"] = think
        return body

    def complete(self, messages: list[dict], schema: dict) -> str:
        url = f"{self.base_url}/api/chat"
        think = self.think
        for _attempt in range(2):
            try:
                reply = _post_json(url, self._body(messages, schema, think), self.timeout)
            except urllib.error.HTTPError as exc:
                msg = _http_error_message(exc)
                if think is not None and "think" in msg.lower():
                    think = None  # model doesn't support the think flag: retry without it
                    continue
                if exc.code == 404 or "not found" in msg.lower():
                    raise LLMUnavailable(f"model '{self.model}' not found in Ollama; run: ollama pull {self.model}") from exc
                raise LLMError(f"Ollama error {exc.code}: {msg}") from exc
            except (urllib.error.URLError, ConnectionError, socket.timeout, TimeoutError) as exc:
                reason = getattr(exc, "reason", exc)
                if isinstance(reason, (socket.timeout, TimeoutError)) or isinstance(exc, (socket.timeout, TimeoutError)):
                    raise LLMUnavailable(f"Ollama timed out after {self.timeout:.0f}s (model still loading?)") from exc
                raise LLMUnavailable(f"Ollama not reachable at {self.base_url} - start it with: ollama serve") from exc
            except ValueError as exc:
                raise LLMError("Ollama returned invalid JSON") from exc
            if isinstance(reply, dict) and reply.get("error"):
                raise LLMError(f"Ollama error: {reply['error']}")
            content = ((reply or {}).get("message") or {}).get("content")
            if not isinstance(content, str):
                raise LLMError("Ollama reply had no message.content")
            return content
        raise LLMError("Ollama rejected the request")

    def health(self) -> tuple[bool, str]:
        """(ok, one-line message) - used by ``python -m coach doctor``."""
        try:
            version = _get_json(f"{self.base_url}/api/version", 5).get("version", "?")
        except Exception:
            return False, f"Ollama not reachable at {self.base_url} - start it with: ollama serve"
        try:
            tags = _get_json(f"{self.base_url}/api/tags", 5)
            names = [m.get("name", "") for m in tags.get("models", [])]
        except Exception:
            return False, f"Ollama {version} is up but /api/tags failed"
        wanted = self.model if ":" in self.model else self.model + ":latest"
        if self.model in names or wanted in names:
            return True, f"Ollama {version} is up and model '{self.model}' is installed"
        return False, (f"Ollama {version} is up but model '{self.model}' is not installed "
                       f"(installed: {', '.join(names) or 'none'}); run: ollama pull {self.model}")


class FakeLLM:
    """Test double. Give it a list of replies (str or dict, used in order and
    the last one repeated) or a function ``(messages, schema) -> str|dict``.
    A reply that is an Exception instance is raised."""

    def __init__(self, replies=None, fn: Callable | None = None):
        self.replies = list(replies or [])
        self.fn = fn
        self.calls: list[list[dict]] = []

    def complete(self, messages: list[dict], schema: dict) -> str:
        self.calls.append(messages)
        if self.fn is not None:
            out = self.fn(messages, schema)
        elif self.replies:
            out = self.replies.pop(0) if len(self.replies) > 1 else self.replies[0]
        else:
            raise LLMUnavailable("FakeLLM has no replies")
        if isinstance(out, BaseException):
            raise out
        return out if isinstance(out, str) else json.dumps(out)


def make_llm(settings) -> OllamaLLM:
    return OllamaLLM(settings.model, settings.ollama_url, timeout=settings.timeout,
                     temperature=settings.temperature, num_ctx=settings.num_ctx,
                     think=settings.think)
