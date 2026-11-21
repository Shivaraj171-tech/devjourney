# Coach: learn while Claude Code codes (v1)

A personal side pane for your terminal. While Claude Code edits your files, the
coach turns one change per turn into a small **learning card**: a concept, a
1–3 sentence explanation that quotes the real changed lines, and sometimes a
quick question you answer with a number key. You earn XP and keep a daily
streak. A **local** model running in Ollama writes the cards, so your code
never leaves your machine.

The coach teaches and never fixes. If it isn't sure, it shows nothing.

This folder is self-contained. It doesn't use or change the web app in this repo.

## How it works

```
Claude Code edits a file
  │  PreToolUse(Write) hook: snapshot the old file (Write doesn't send the old text)
  │  PostToolUse(Edit|Write) hook, async: append {before, after} to ~/.claude-coach/queue.jsonl
  ▼
Stop hook (end of Claude's turn, async) starts `python -m coach process` in the background
  ▼
grounding.py   unified diff + enclosing function/class (Python `ast`) or ±8 lines; size caps;
               skips binary, huge and secret-looking files
  ▼
llm.py         Ollama /api/chat, format = JSON schema, temperature 0.2, no chat history
  ▼
cards.py       hard validation (see below)          ── fail → rejected.jsonl, no card
  ▼
verify.py      predict-the-output? run the snippet; answer must match real output ── fail → no card
  ▼
cards.jsonl  →  side pane (`python -m coach app` or `python -m coach watch`) + status line
```

The hooks print nothing to stdout, always exit 0 and log problems to
`~/.claude-coach/errors.log`, so they can't slow down or confuse Claude. The
model runs in the background after the turn ends, never inside a hook.

## How it avoids made-up content

Each layer is deterministic code. A card has to pass all of them:

1. **Narrow input.** The model sees only the diff and the function or class around it
   (or a small window of lines), with no chat history and a fixed system prompt.
2. **Constrained output.** Ollama's `format` is set to the card's JSON schema, with a
   fixed list of concept tags and low temperature.
3. **Schema re-check.** Every field is checked again in Python: types, no extra or
   missing keys, a concept from the list, 1–3 sentences, 2–4 distinct choices and a
   valid answer index. Ollama may ignore parts of a schema, so the coach doesn't rely on it.
4. **Literal quotes.** Every `quoted_lines` entry must be a line that actually appears
   in the diff (ignoring only leading and trailing whitespace).
5. **On-topic check.** Any identifier the explanation, question or choices mention, such
   as backticked code, `dotted.names`, `snake_case`, `camelCase` or `call(`, must
   appear in the diff or context. Python builtins, keywords and common JS keywords are
   also allowed. This catches things like "use `collections.Counter`" when the diff
   never mentions it.
6. **Question rules.**
   - `spot_line`: every choice must be a real diff line.
   - `predict_output`: only allowed for Python changes. The snippet must parse, only
     import a small allowlist of pure stdlib modules, avoid `open`/`eval`/`exec`/dunder
     tricks, call `print`, and reuse at least one identifier from the diff.
   - `why`: these can't be checked by a machine, so by default the question is removed
     and only the validated explanation is kept. Set `allow_why` to keep them.
7. **Execution check.** A `predict_output` snippet is run (see the sandbox section
   below). The card is dropped if the snippet fails or times out, or if the model's
   answer doesn't equal the real normalised stdout. It's also dropped if more than one
   choice matches. When you answer, the pane shows the snippet and what it printed.
8. **Rate limit.** At most one card per Claude turn, and at most 3 model calls per turn.

Rejected cards and the reasons are logged in `~/.claude-coach/rejected.jsonl`,
so you can see what the model got wrong.

## Setup

You need **Python 3.10+** and **Claude Code**. Textual is optional. Nothing else is required.

### 1. Install Ollama and pull a model

- **macOS:** download the app from https://ollama.com/download, or run `brew install ollama`.
- **Linux:** follow https://ollama.com/download/linux (an install script, or your package manager).
- **Windows:** use Ollama's Windows installer. If you run Claude Code inside **WSL**,
  either install Ollama inside WSL too, or keep it on Windows and point the coach at
  it with `COACH_OLLAMA_URL`. With WSL2 NAT networking that's usually the Windows
  host IP, not `127.0.0.1`. Check with `curl $COACH_OLLAMA_URL/api/version`.

Pick a model. The research doc (`docs/research/coach-oss.md`) recommends
**Qwen3.5 9B** for 16 GB+ machines and **Qwen3.5 4B** for 8–16 GB.
**The coach's default tag `qwen3.5:9b` is a guess that wasn't checked against
ollama.com.** Before pulling:

1. Open the model's page on https://ollama.com/library and copy the **exact tag**.
2. Read its **licence** on the model card. Most Qwen models are Apache-2.0, but some
   sizes (for example Qwen2.5-Coder-3B) are research-only.
3. Pull it and tell the coach the tag if it differs:

```bash
ollama pull <exact-tag>                 # e.g. what ollama.com lists for Qwen3.5 9B
mkdir -p ~/.claude-coach
echo '{"model": "<exact-tag>"}' > ~/.claude-coach/config.json
```

Check that everything is in place. Run these from the repo root, the folder that
contains `coach/`:

```bash
python3 -m coach doctor
python3 coach/scripts/demo.py           # whole pipeline with a fake model, no Ollama needed
python3 coach/scripts/demo.py --ollama  # same sample change, real model
```

### 2. Add the hooks and status line

```bash
python3 -m coach install --user                         # PRINTS the JSON for ~/.claude/settings.json
python3 -m coach install --user --write                 # merges it (backup first)
# or for one project only, in the uncommitted local settings file:
python3 -m coach install --project ~/code/myapp --local --write --with-output-style
```

- Without `--write`, nothing is changed. The command only prints what to add.
- With `--write`, the settings file is first backed up to `settings.json.coach-backup-<time>`.
  Your other keys and hooks are kept, rerunning doesn't duplicate entries, and an
  existing status line is kept unless you pass `--replace-statusline`.
  `--write --remove` takes the coach back out.
- The commands use absolute paths to this Python and this folder. If you move the
  repo, run install again.
- `--with-output-style` copies `output-styles/learn-with-coach.md`. Turn it on in
  Claude Code with `/output-style`. It asks Claude to explain choices briefly and
  sometimes leave one small, safe `TODO(human)`. It's optional. The built-in
  **Learning** and **Explanatory** styles are good alternatives.

What gets installed (paths will differ):

```json
{
  "hooks": {
    "PreToolUse":  [{"matcher": "Write",      "hooks": [{"type": "command", "command": "\"/usr/bin/python3\" \"/path/coach/capture.py\"", "timeout": 10}]}],
    "PostToolUse": [{"matcher": "Edit|Write", "hooks": [{"type": "command", "command": "\"/usr/bin/python3\" \"/path/coach/capture.py\"", "async": true, "timeout": 30}]}],
    "Stop":        [{"hooks": [{"type": "command", "command": "\"/usr/bin/python3\" \"/path/coach/capture.py\"", "async": true, "timeout": 30}]}]
  },
  "statusLine": {"type": "command", "command": "\"/usr/bin/python3\" \"/path/coach/statusline.py\""}
}
```

The PreToolUse snapshot runs **synchronously** on purpose, because it must finish
before the Write happens. It only reads one file.

### 3. Open the side pane

Split your terminal (iTerm2, tmux, the VS Code terminal split, or Windows Terminal)
and run this from the repo root:

```bash
pip install textual          # optional
python3 -m coach app         # Textual pane: 1-4 answer, n/p next/previous, q quit
python3 -m coach watch       # zero-dependency fallback
```

The status line in Claude Code shows `🎓 XP 120 · 🔥 3 · last: dictionaries`.
Other commands: `python3 -m coach status` and `python3 -m coach process` (process
the queue now and print why cards were rejected).

## Settings

Set these in `~/.claude-coach/config.json`. Environment variables of the same name
take priority, but hooks inherit Claude Code's environment, so the config file is
the reliable place.

| key | env | default |
|---|---|---|
| `model` | `COACH_MODEL` | `qwen3.5:9b` (unverified; see above) |
| `ollama_url` | `COACH_OLLAMA_URL` | `http://127.0.0.1:11434` |
| `timeout` | `COACH_TIMEOUT` | 120 s |
| `temperature` | `COACH_TEMPERATURE` | 0.2 |
| `num_ctx` | `COACH_NUM_CTX` | 8192 |
| `think` | `COACH_THINK` | false (sent as Ollama's `think`; dropped automatically if the model rejects it) |
| `max_cards_per_run` | `COACH_MAX_CARDS` | 1 |
| `allow_why` | `COACH_ALLOW_WHY` | false |
| `sandbox` | `COACH_SANDBOX` | `auto` (use bwrap when it works), `bwrap`, `none` |
| `autoprocess` | `COACH_AUTOPROCESS` | true (the Stop hook starts the processor) |

The data directory is `~/.claude-coach/`. Override it with `COACH_HOME`.

## The snippet sandbox: be realistic

`verify.py` is a **best-effort sandbox, not a security boundary**. It only runs the
short snippet the model wrote for a card, after the static checks above. It never
runs your project's code.

Snippets run with:

- `python -I -c` in a fresh temp directory, with an empty environment
- a 2 s timeout
- `RLIMIT_CPU`, `RLIMIT_AS`, `RLIMIT_FSIZE` and `RLIMIT_NOFILE` on Linux and macOS
  (macOS doesn't enforce `RLIMIT_AS`)
- a Python audit hook that blocks sockets, subprocesses, file writes and file-system
  changes
- **Bubblewrap** (`bwrap`) with every namespace unshared and a read-only root, if it's
  installed and works. On Linux, `sudo apt install bubblewrap` (or your distro's
  package) makes it much stronger. macOS and Windows have no bwrap, so they rely on
  the other layers.

A determined attacker who controls the model's output could probably escape the
non-bwrap layers. That risk is low here because the model only sees your own diff,
but don't point the coach at untrusted repos with `sandbox: none`.

## Privacy

Everything runs on your machine. Hooks write to `~/.claude-coach/`, and the model
call goes to your local Ollama. The coach makes no other network calls and sends no
telemetry. Claude Code itself still sends your code to Anthropic as usual, and the
coach doesn't change that. Secret-looking files (`.env*`, keys, `.ssh/`, `.aws/`,
`*secret*`, …) and diffs that look like they contain tokens or private keys are never
queued and never sent to the model. Delete `~/.claude-coach/` to wipe everything.

## Limits of v1

- **Never tested against a real model.** Everything was tested with `FakeLLM` and a
  stand-in HTTP server that mimics Ollama's documented `/api/chat` reply. How often
  a real Qwen model writes cards that pass the checks is unknown. Start with
  `python3 -m coach process` and `rejected.jsonl` to tune it.
- `predict_output` is only for Python changes. Other languages get explanations,
  `spot_line` questions, or no question at all.
- For Edit, the "before" text is rebuilt by swapping `new_string` back to
  `old_string` in the file after the edit. If `new_string` also appears earlier in
  the file, the diff can point at the wrong place. Because the PostToolUse hook is
  async, a very quick second edit can also make the event stale, and it's skipped.
- If Write has no snapshot (for example, the PreToolUse hook wasn't installed), the
  whole new content is treated as added.
- When Ollama is down, that turn's changes are dropped (not retried) and the status
  line shows why.
- `NotebookEdit` isn't captured.
- The identifier check is a heuristic. It can reject good cards that use an outside
  term in backticks, and that's deliberate.
- File locking uses `fcntl` (macOS and Linux). On native Windows, appends and the
  processor lock are best-effort. WSL behaves like Linux.

## Tests

```bash
python3 -m unittest discover -s coach/tests     # stdlib only; the Textual test is skipped without textual
```
