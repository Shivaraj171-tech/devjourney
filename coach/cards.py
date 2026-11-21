"""The learning-card schema and the hard, deterministic validator.

A card the model writes is only kept if every check here passes. The checks
use the standard library only, and each failure has a short reason string so
rejected cards can be logged and inspected (``rejected.jsonl``).
"""

from __future__ import annotations

import ast
import builtins
import keyword
import re

from coach.grounding import Grounding

CONCEPTS = [
    "variables", "strings", "string_formatting", "numbers", "booleans", "none_null",
    "conditionals", "loops", "functions", "arguments", "return_values", "scope",
    "lists", "dictionaries", "sets", "tuples", "slicing", "comprehensions",
    "sorting", "iterators", "generators", "classes", "inheritance", "dataclasses",
    "exceptions", "imports", "modules", "closures", "decorators", "recursion",
    "typing", "async", "context_managers", "file_io", "regex", "testing",
    "logging", "configuration", "data_validation", "immutability",
    "objects", "arrays", "destructuring", "promises", "callbacks", "components",
    "state_management", "http", "sql", "json", "performance", "refactoring",
]

QUESTION_KINDS = ["predict_output", "spot_line", "why", "none"]

FIELDS = ["concept", "explanation", "quoted_lines", "question_kind", "question",
          "choices", "answer_index", "verify_snippet"]

# JSON schema sent to Ollama's ``format`` field. Ollama turns it into a grammar;
# it may ignore some keywords, so validate_card() re-checks everything.
CARD_SCHEMA = {
    "type": "object",
    "properties": {
        "concept": {"type": "string", "enum": CONCEPTS},
        "explanation": {"type": "string"},
        "quoted_lines": {"type": "array", "items": {"type": "string"}, "minItems": 1, "maxItems": 3},
        "question_kind": {"type": "string", "enum": QUESTION_KINDS},
        "question": {"type": "string"},
        "choices": {"type": "array", "items": {"type": "string"}, "maxItems": 4},
        "answer_index": {"type": "integer"},
        "verify_snippet": {"type": "string"},
    },
    "required": FIELDS,
    "additionalProperties": False,
}

MAX_EXPLANATION = 500
MAX_QUESTION = 300
MAX_CHOICE = 200
MAX_SNIPPET_CHARS = 1500
MAX_SNIPPET_LINES = 40

SAFE_MODULES = {
    "math", "itertools", "collections", "functools", "operator", "string", "re",
    "json", "dataclasses", "typing", "enum", "decimal", "fractions", "statistics",
    "textwrap", "copy", "heapq", "bisect", "datetime",
}
BANNED_NAMES = {
    "open", "exec", "eval", "compile", "__import__", "input", "breakpoint",
    "globals", "locals", "vars", "getattr", "setattr", "delattr", "help", "exit", "quit",
    "memoryview",
}
ALLOWED_DUNDER_ATTRS = {"__init__", "__name__", "__doc__"}

COMMON_CODE_WORDS = {
    # JS/TS keywords and globals a card may mention without them being in the diff
    "const", "let", "var", "function", "return", "null", "undefined", "true", "false",
    "this", "new", "async", "await", "typeof", "instanceof", "export", "import",
    "default", "class", "extends", "interface", "type", "enum", "void", "string",
    "number", "boolean", "object", "Array", "Object", "Promise", "console",
    # generic programming words that tokenise like identifiers
    "e.g", "i.e", "etc", "vs",
}
KNOWN_WORDS = set(dir(builtins)) | set(keyword.kwlist) | set(getattr(keyword, "softkwlist", [])) | COMMON_CODE_WORDS

IDENT = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
STRING_LIT = re.compile(r"""("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')""")
BACKTICK = re.compile(r"`([^`\n]+)`")
# identifier-looking words in prose: dotted names, snake_case, camelCase, name(
CODEY = re.compile(
    r"(?<![\w.])("
    r"[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+"
    r"|[A-Za-z]\w*_\w+"
    r"|[a-z]+[A-Z]\w*"
    r"|[A-Za-z_]\w*(?=\()"
    r")"
)
SENTENCE_END = re.compile(r"[.!?](?:\s|$)")


def normalise_output(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.rstrip() for line in text.split("\n")]
    return "\n".join(lines).strip()


def normalise_choice(text: str) -> str:
    t = normalise_output(text)
    if len(t) >= 2 and t[0] == t[-1] == "`":
        t = t.strip("`").strip()
    return t


def _strip_line(s: str) -> str:
    return s.strip()


def _count_sentences(text: str) -> int:
    t = BACKTICK.sub("x", text.strip())  # dots inside code don't end sentences
    t = re.sub(r"\b(e\.g|i\.e|etc|vs)\.", "x", t)
    n = len(SENTENCE_END.findall(t + " "))
    return max(n, 1) if t else 0


def identifiers_in_text(text: str) -> set[str]:
    """Code-like identifiers mentioned in prose (backticked spans + heuristics)."""
    found: set[str] = set()
    for span in BACKTICK.findall(text):
        span = STRING_LIT.sub(" ", span)
        found.update(IDENT.findall(span))
    prose = BACKTICK.sub(" ", text)
    prose = STRING_LIT.sub(" ", prose)
    for tok in CODEY.findall(prose):
        if tok.lower() in COMMON_CODE_WORDS:
            continue
        found.update(IDENT.findall(tok))
    return found


def unknown_identifiers(text: str, grounding: Grounding) -> set[str]:
    corpus_tokens = set(IDENT.findall(grounding.corpus()))
    return {t for t in identifiers_in_text(text)
            if t not in corpus_tokens and t not in KNOWN_WORDS and len(t) > 1}


def snippet_policy_errors(snippet: str, grounding: Grounding) -> list[str]:
    """Static checks before a snippet is ever executed."""
    errs: list[str] = []
    if not snippet.strip():
        return ["predict_output needs a verify_snippet"]
    if len(snippet) > MAX_SNIPPET_CHARS or snippet.count("\n") + 1 > MAX_SNIPPET_LINES:
        return ["verify_snippet too long"]
    try:
        tree = ast.parse(snippet)
    except (SyntaxError, ValueError):
        return ["verify_snippet is not valid Python"]
    has_print = False
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.split(".")[0] not in SAFE_MODULES:
                    errs.append(f"snippet imports {alias.name}")
        elif isinstance(node, ast.ImportFrom):
            if (node.module or "").split(".")[0] not in SAFE_MODULES or node.level:
                errs.append(f"snippet imports from {node.module}")
        elif isinstance(node, ast.Name) and node.id in BANNED_NAMES:
            errs.append(f"snippet uses {node.id}")
        elif isinstance(node, ast.Attribute) and node.attr.startswith("__") and node.attr not in ALLOWED_DUNDER_ATTRS:
            errs.append(f"snippet touches {node.attr}")
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "print":
            has_print = True
    if not has_print:
        errs.append("snippet never prints")
    # grounding: the snippet must reuse at least one identifier from the diff
    diff_idents = set(IDENT.findall("\n".join(grounding.added + grounding.removed)))
    snip_idents = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name)}
    snip_idents |= {n.attr for n in ast.walk(tree) if isinstance(n, ast.Attribute)}
    snip_idents |= {n.name for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.ClassDef))}
    meaningful = {t for t in diff_idents if t not in {"print", "self", "None", "True", "False"} and len(t) > 1}
    if meaningful and not (snip_idents & meaningful):
        errs.append("snippet shares no identifier with the diff")
    return errs


def validate_card(card, grounding: Grounding, *, allow_why: bool = False) -> tuple[dict | None, list[str]]:
    """Returns (clean_card, []) when valid, else (None, reasons).

    With ``allow_why`` False, a "why" question can't be machine-checked, so the
    question is removed and the (validated) explanation is kept on its own.
    """
    errs: list[str] = []
    if not isinstance(card, dict):
        return None, ["card is not a JSON object"]
    missing = [f for f in FIELDS if f not in card]
    extra = [k for k in card if k not in FIELDS]
    if missing:
        errs.append(f"missing fields: {', '.join(missing)}")
    if extra:
        errs.append(f"unexpected fields: {', '.join(extra)}")
    if errs:
        return None, errs

    concept = card["concept"]
    explanation = card["explanation"]
    quoted = card["quoted_lines"]
    kind = card["question_kind"]
    question = card["question"]
    choices = card["choices"]
    answer = card["answer_index"]
    snippet = card["verify_snippet"]

    if concept not in CONCEPTS:
        errs.append("concept not in the allowed list")
    if not isinstance(explanation, str) or not explanation.strip():
        errs.append("explanation empty")
    elif len(explanation) > MAX_EXPLANATION:
        errs.append("explanation too long")
    elif not 1 <= _count_sentences(explanation) <= 3:
        errs.append("explanation must be 1-3 sentences")
    if not isinstance(quoted, list) or not 1 <= len(quoted) <= 3 or not all(isinstance(q, str) for q in quoted):
        errs.append("quoted_lines must be 1-3 strings")
        quoted = []
    if kind not in QUESTION_KINDS:
        errs.append("bad question_kind")
    if not isinstance(question, str) or len(question) > MAX_QUESTION:
        errs.append("bad question")
    if not isinstance(choices, list) or not all(isinstance(c, str) for c in choices):
        errs.append("choices must be strings")
        choices = []
    if isinstance(answer, bool) or not isinstance(answer, int):
        errs.append("answer_index must be an integer")
    if not isinstance(snippet, str):
        errs.append("verify_snippet must be a string")
    if errs:
        return None, errs

    # Layer: every quoted line must literally appear in the diff.
    diff_lines = {_strip_line(l) for l in grounding.diff_body_lines() if _strip_line(l)}
    for q in quoted:
        qs = _strip_line(q)
        if len(qs) < 2 or qs not in diff_lines:
            errs.append(f"quoted line not in diff: {q[:60]!r}")

    # Layer: no identifiers the diff/context doesn't contain (on-topic check).
    texts = [explanation, question] + (choices if kind in ("why", "none") else [])
    unknown: set[str] = set()
    for t in texts:
        unknown |= unknown_identifiers(t, grounding)
    if unknown:
        errs.append(f"mentions identifiers not in the code: {', '.join(sorted(unknown)[:5])}")

    # Layer: question shape.
    if kind == "none":
        if choices:
            errs.append("question_kind none must have no choices")
    else:
        if not question.strip():
            errs.append("question text empty")
        if not 2 <= len(choices) <= 4:
            errs.append("need 2-4 choices")
        if any(len(c) > MAX_CHOICE or not c.strip() for c in choices):
            errs.append("choice empty or too long")
        normed = [normalise_choice(c) for c in choices]
        if len(set(normed)) != len(normed):
            errs.append("duplicate choices")
        if not 0 <= answer < len(choices):
            errs.append("answer_index out of range")
        if kind == "spot_line":
            for c in choices:
                if _strip_line(c) not in diff_lines:
                    errs.append(f"spot_line choice not a diff line: {c[:60]!r}")
        if kind == "predict_output":
            if grounding.language != "python":
                errs.append("predict_output is only verifiable for Python changes")
            else:
                errs.extend(snippet_policy_errors(snippet, grounding))
    if errs:
        return None, errs

    clean = {
        "concept": concept,
        "explanation": explanation.strip(),
        "quoted_lines": [q.strip() for q in quoted],
        "question_kind": kind,
        "question": question.strip(),
        "choices": [c.strip() for c in choices] if kind != "none" else [],
        "answer_index": answer if kind != "none" else -1,
        "verify_snippet": snippet if kind == "predict_output" else "",
    }
    if kind == "why" and not allow_why:
        clean.update(question_kind="none", question="", choices=[], answer_index=-1)
    return clean, []
