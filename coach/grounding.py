"""Turn a captured change into the only text the LLM is allowed to see.

The grounding is a unified diff plus the enclosing function or class (found
with the standard-library ``ast`` module for ``.py`` files) or a window of
lines around the change for other languages. Everything is size-capped.
Binary, huge and secret-looking files are skipped entirely.
"""

from __future__ import annotations

import ast
import difflib
import fnmatch
import re
from dataclasses import dataclass, field
from pathlib import PurePath

MAX_FILE_BYTES = 400_000
MAX_DIFF_LINES = 120
MAX_CONTEXT_LINES = 80
WINDOW = 8

LANGUAGES = {
    ".py": "python", ".pyi": "python",
    ".js": "javascript", ".mjs": "javascript", ".cjs": "javascript", ".jsx": "javascript",
    ".ts": "typescript", ".tsx": "typescript",
    ".go": "go", ".rs": "rust", ".java": "java", ".kt": "kotlin", ".rb": "ruby",
    ".c": "c", ".h": "c", ".cpp": "cpp", ".cc": "cpp", ".hpp": "cpp", ".cs": "csharp",
    ".php": "php", ".swift": "swift", ".sh": "shell", ".bash": "shell", ".sql": "sql",
    ".html": "html", ".css": "css", ".scss": "css", ".md": "markdown",
    ".json": "json", ".yaml": "yaml", ".yml": "yaml", ".toml": "toml",
}

SENSITIVE_NAMES = [
    ".env", ".env.*", "*.env", ".envrc", "*.pem", "*.key", "*.p12", "*.pfx", "*.jks",
    "*.keystore", "*.kdbx", "id_rsa*", "id_dsa*", "id_ecdsa*", "id_ed25519*",
    "credentials", "credentials.*", "*secret*", "*secrets*", ".npmrc", ".pypirc",
    ".netrc", ".git-credentials", "*.tfvars", "*.tfstate", "service-account*.json",
]
SENSITIVE_DIRS = {".ssh", ".aws", ".gnupg", ".kube", ".docker", ".azure", ".gcloud"}
SECRET_PATTERNS = [
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b"),
    re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
    re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}\b"),
    re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"),
]


class GroundingSkip(Exception):
    """The change should not produce a card. ``str(exc)`` is the reason."""


def is_sensitive_path(path: str) -> bool:
    p = PurePath(path.replace("\\", "/"))
    name = p.name.lower()
    if any(part.lower() in SENSITIVE_DIRS for part in p.parts[:-1]):
        return True
    return any(fnmatch.fnmatch(name, pat) for pat in SENSITIVE_NAMES)


def looks_secret(text: str) -> bool:
    return any(p.search(text) for p in SECRET_PATTERNS)


def looks_binary(text: str) -> bool:
    return "\x00" in text[:8192]


def language_for(path: str) -> str:
    return LANGUAGES.get(PurePath(path).suffix.lower(), "text")


@dataclass
class Grounding:
    file_path: str
    language: str
    diff: str
    added: list[str]
    removed: list[str]
    context: str
    context_label: str
    changed_lines: list[int] = field(default_factory=list)

    def diff_body_lines(self) -> list[str]:
        """Diff lines without their +/-/space prefix (headers excluded)."""
        out = []
        for line in self.diff.splitlines():
            if line.startswith(("---", "+++", "@@", "...")):
                continue
            out.append(line[1:] if line[:1] in "+- " else line)
        return out

    def corpus(self) -> str:
        return "\n".join([self.file_path, self.diff, self.context])


def _changed_after_lines(before: list[str], after: list[str]) -> list[int]:
    """1-based line numbers in ``after`` touched by the change."""
    changed: set[int] = set()
    sm = difflib.SequenceMatcher(a=before, b=after, autojunk=False)
    for tag, _i1, _i2, j1, j2 in sm.get_opcodes():
        if tag in ("replace", "insert"):
            changed.update(range(j1 + 1, j2 + 1))
        elif tag == "delete":
            changed.add(max(1, min(j1 + 1, len(after))) if after else 1)
    return sorted(changed)


def _python_scope(after_text: str, lo: int, hi: int) -> tuple[int, int, str] | None:
    try:
        tree = ast.parse(after_text)
    except (SyntaxError, ValueError):
        return None
    best: tuple[int, int, str] | None = None
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            continue
        start = min([node.lineno] + [d.lineno for d in node.decorator_list])
        end = getattr(node, "end_lineno", None) or node.lineno
        if start <= lo and hi <= end:
            if best is None or (end - start) < (best[1] - best[0]):
                kind = "class" if isinstance(node, ast.ClassDef) else (
                    "async def" if isinstance(node, ast.AsyncFunctionDef) else "def")
                best = (start, end, f"{kind} {node.name}")
    return best


def ground(event: dict, *, max_diff_lines: int = MAX_DIFF_LINES,
           max_context_lines: int = MAX_CONTEXT_LINES, window: int = WINDOW) -> Grounding:
    file_path = str(event.get("file_path") or "")
    before = event.get("before")
    after = event.get("after")
    if not file_path or not isinstance(after, str):
        raise GroundingSkip("missing file or content")
    if before is None:
        before = ""
    if not isinstance(before, str):
        raise GroundingSkip("bad before content")
    if is_sensitive_path(file_path):
        raise GroundingSkip("sensitive-looking file")
    if len(before.encode("utf-8", "ignore")) > MAX_FILE_BYTES or len(after.encode("utf-8", "ignore")) > MAX_FILE_BYTES:
        raise GroundingSkip("file too large")
    if looks_binary(before) or looks_binary(after):
        raise GroundingSkip("binary file")

    b_lines = before.splitlines()
    a_lines = after.splitlines()
    name = PurePath(file_path).name
    diff_lines = list(difflib.unified_diff(b_lines, a_lines, fromfile=f"a/{name}",
                                           tofile=f"b/{name}", lineterm="", n=3))
    if not diff_lines:
        raise GroundingSkip("no change")
    added = [l[1:] for l in diff_lines if l.startswith("+") and not l.startswith("+++")]
    removed = [l[1:] for l in diff_lines if l.startswith("-") and not l.startswith("---")]
    if sorted(x.strip() for x in added if x.strip()) == sorted(x.strip() for x in removed if x.strip()):
        raise GroundingSkip("whitespace-only change")
    if looks_secret("\n".join(added + removed)):
        raise GroundingSkip("diff looks like it contains a secret")
    if len(diff_lines) > max_diff_lines:
        diff_lines = diff_lines[:max_diff_lines] + ["... (diff truncated)"]
        added = [l[1:] for l in diff_lines if l.startswith("+") and not l.startswith("+++")]
        removed = [l[1:] for l in diff_lines if l.startswith("-") and not l.startswith("---")]

    changed = _changed_after_lines(b_lines, a_lines)
    language = language_for(file_path)
    lo, hi = (changed[0], changed[-1]) if changed else (1, 1)

    scope = _python_scope(after, lo, hi) if language == "python" else None
    if scope and (scope[1] - scope[0] + 1) <= max_context_lines:
        start, end, label = scope
    else:
        start = max(1, lo - window)
        end = min(len(a_lines), hi + window)
        if end - start + 1 > max_context_lines:
            end = start + max_context_lines - 1
        label = (f"part of {scope[2]}, " if scope else "") + f"lines {start}-{end}"
    context = "\n".join(a_lines[start - 1:end])
    if looks_secret(context):
        raise GroundingSkip("context looks like it contains a secret")

    return Grounding(file_path=file_path, language=language, diff="\n".join(diff_lines),
                     added=added, removed=removed, context=context,
                     context_label=label, changed_lines=changed)
