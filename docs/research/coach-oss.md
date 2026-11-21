# "Learn while AI codes" coach: reusable open-source building blocks

Researched 2026-11-21; things change, so re-check before depending on anything. Licences were verified from LICENSE files or official cards/docs unless marked "not verified". Effort: S = config/drop-in, M = glue or fork, L = major. Star counts weren't checked (GitHub API blocked). huggingface.co was unreachable, so Qwen licences come from card snippets via search plus the QwenLM repos.

## 1. Local LLM runtimes

| Name | URL | What it gives us | Licence | Effort |
|---|---|---|---|---|
| Ollama | https://github.com/ollama/ollama · docs: https://docs.ollama.com/capabilities/structured-outputs | One-command model pulls. Native API plus an OpenAI-compatible API. Its `format` field takes a full JSON schema, and it also works through the OpenAI-style `response_format`. Docs note that Ollama Cloud doesn't support structured outputs (we run locally, so this doesn't affect us). | MIT | S |
| llama.cpp `llama-server` | https://github.com/ggml-org/llama.cpp · server docs: https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md · GBNF: https://github.com/ggml-org/llama.cpp/blob/master/grammars/README.md | OpenAI-compatible server. Accepts `grammar` (GBNF) and `json_schema` on completion requests, and `response_format` with a schema on chat. Only a JSON Schema subset is supported; validate output ourselves. | MIT | S–M |
| LM Studio | https://lmstudio.ai/docs/developer/openai-compat/structured-output | GUI and server at `localhost:1234/v1`. JSON-schema structured output through `response_format` (json_schema mode). | App is proprietary; licence not verified | S |
| vLLM | https://github.com/vllm-project/vllm · https://docs.vllm.ai/en/latest/features/structured_outputs.html | High-throughput OpenAI-compatible server with xgrammar or guidance backends. The legacy `guided_json` fields were removed in v0.12. It's GPU-oriented and too heavy for most laptops. | Apache-2.0 | M–L |

## 2. Qwen models (feed diffs as text, so no vision model is needed)

| Model | Source | Notes | Licence | Effort |
|---|---|---|---|---|
| Qwen3.5 0.8B/2B/4B/9B (released 2026-03-02); 27B, 35B-A3B, 122B-A10B (released 2026-02-24) | https://github.com/QwenLM/Qwen3.5 · https://huggingface.co/Qwen/Qwen3.5-9B | General instruct models. **9B** is the laptop sweet spot for explanations and quizzes, and **4B** is the fallback for a low-RAM machine. | Apache-2.0 (card metadata, via search) | S |
| Qwen3-Coder-30B-A3B-Instruct, Qwen3-Coder-Next (80B-A3B), 480B-A35B | https://github.com/QwenLM/Qwen3-Coder | Code-specialised with 256k context. 30B-A3B suits 32 GB+ machines. | Apache-2.0 per secondary sources; check the card | S |
| Qwen2.5-Coder 0.5–32B | https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct | Older but well supported. 7B is Apache-2.0. **3B is `qwen-research` (non-commercial)**, so avoid it for a product. | 7B Apache-2.0; 3B qwen-research | S |
| Qwen3-VL 2B/4B/8B/30B-A3B/32B/235B | https://github.com/QwenLM/Qwen3-VL | Only needed if we later explain screenshots or UI diffs. **Not needed for text diffs.** | Repo Apache-2.0 | — |

Model mix: one small model explains and writes quizzes; deterministic code (section 3) checks them rather than a second "judge" LLM. A 30B-A3B/27B model is optional for user-started deep dives. Qwen3.6-35B-A3B (2026-04-16, per the Qwen3.5 repo) also exists; licence not verified.

## 3. Anti-hallucination and grounding

| Name | URL | What it gives us | Licence | Effort |
|---|---|---|---|---|
| Instructor | https://github.com/567-labs/instructor | Pydantic models in, validated objects out, with retry on validation failure. Works with Ollama's OpenAI-compatible endpoint. | MIT | S |
| Outlines | https://github.com/dottxt-ai/outlines | Constrained generation (JSON schema, regex, choice). Has integrations for LM Studio, vLLM and others. | Apache-2.0 | M |
| Guidance / llguidance | https://github.com/guidance-ai/guidance | Grammar-constrained programs. Its engine is a vLLM backend. | MIT | M |
| llm-sandbox | https://github.com/vndee/llm-sandbox | Runs generated code with Docker or Podman, or with local **Bubblewrap/NsJail** backends that need no daemon. Lets us execute "what does this print?" questions and confirm the answer. | MIT | S–M |
| Pydantic Monty | https://github.com/pydantic/monty · https://pydantic.dev/articles/pydantic-monty | Minimal Python interpreter in Rust (open-sourced 2026-02-27). Very fast and safe, but supports only a limited stdlib. Good for tiny snippet checks. | MIT | S |
| pytest / doctest (stdlib) | https://docs.python.org/3/library/doctest.html | The model writes a question plus a doctest-style expected output, which we run (sandboxed) and discard on mismatch. | PSF | S |
| tree-sitter-language-pack | https://github.com/Goldziher/tree-sitter-language-pack | Prebuilt grammars for many languages. Gives us the enclosing function or class of each diff hunk. | MIT | S |
| astchunk (cAST) | https://github.com/yilinjz/astchunk | AST-aware chunking for small repo retrieval. | MIT | S |
| Repomix | https://github.com/yamadashy/repomix | Packs a repo or files into one LLM-ready file, with token counts and ignore rules. Useful for a one-off "project overview" card. | MIT | S |

## 4. Existing "explain or quiz my AI's code" projects

| Name | URL | What it is / what to reuse | Licence | Effort |
|---|---|---|---|---|
| **DiffDojo** | https://github.com/Ninjacornix/Diffdojo | Claude Code plugin that does almost exactly this. It quizzes on each change Claude makes and has XP, belts, streaks, Bug Hunter and timed modes. UIs: terminal pane, side pane, browser quiz (`diffdojo serve`). It mixes static-analysis questions, about 270 hand-written packs, and LLM questions from `claude -p` (Haiku by default). Snippets are sandboxed with bubblewrap on Linux. **The LLM isn't local**, so we'd swap it for Ollama. Very new (0 stars, ~42 commits). | MIT | M (fork) or reference design |
| socratic-skills | https://github.com/rodbv/socratic-skills | Claude Code skill that quizzes you on staged or unstaged diffs, specs and plans. | MIT | S |
| block-quiz | https://github.com/jvhaarst/block-quiz | You explain each diff block in your own words and get graded against the code. Uses local git only. | MIT | S |
| quiz-me | https://github.com/juliaoesterle/quiz-me | Comprehension gate before `git push` (optional pre-push hook). | Not verified | S |
| askdiff | https://github.com/narghev/askdiff | Lets you ask the agent about its own changes from a diff viewer. Installs as a Claude Code skill. | MIT | S |
| TARS (VS Code) | https://github.com/leotodisco/tars | Personalised code explanations with LangGraph. Supports Ollama. | MIT | M |
| Continue | https://github.com/continuedev/continue | Mature VS Code/JetBrains assistant that works with Ollama. Has "explain", but no quiz. | Not verified (believed Apache-2.0) | M |

## 5. UIs for a "learning card"

| Name | URL | What it gives us | Licence | Effort |
|---|---|---|---|---|
| Textual | https://github.com/Textualize/textual | Python TUI: cards, buttons, multiple choice, progress bars. Runs in a tmux or terminal split next to Claude Code, and can also be served to a browser. | MIT | S |
| Local web page | FastAPI/Flask + HTMX (no single repo) | Card in the browser on `localhost`. DiffDojo's `serve` mode is an example. | — | M |
| VS Code webview | https://code.visualstudio.com/api/extension-guides/webview | Card inside the editor. Needs a TypeScript extension. | — | L |

## 6. Claude Code native features and community hooks

| Name | URL | What exists | Licence | Effort |
|---|---|---|---|---|
| Output styles (official) | https://code.claude.com/docs/en/output-styles | Built-in styles: **Default, Proactive, Concise, Explanatory, Learning**. Explanatory adds `★ Insight` blocks explaining choices. Learning adds Insights and leaves `TODO(human)` pieces for you to write. Set via `/output-style`, `/config`, or `"outputStyle"` in settings. Custom styles are Markdown files in `~/.claude/output-styles` or `.claude/output-styles`, with frontmatter `name`, `description`, `keep-coding-instructions`, and `force-for-plugin` (plugin styles only). The docs say a style is an instruction, not a guarantee, and point to hooks for anything that must always happen. | Proprietary product | S |
| Hooks (official) | https://code.claude.com/docs/en/hooks-guide | Lifecycle events such as `PostToolUse` let us capture every Edit/Write and pass the changed file or diff to our coach. | — | S |
| karanb192/claude-code-hooks | https://github.com/karanb192/claude-code-hooks | Installable hook plugin marketplace (22 plugins per its README). | MIT | S |
| disler/claude-code-hooks-mastery | https://github.com/disler/claude-code-hooks-mastery | Examples of every hook event, including Ollama-backed hook scripts. | Not verified | S |

## Recommended stack

1. **Baseline at zero effort:** turn on the built-in **Explanatory** or **Learning** output style. This gives Claude-authored explanations right away and sets the quality bar the local coach must beat.
2. **Trigger:** a Claude Code `PostToolUse` hook on `Edit|Write|MultiEdit`. It only appends `{file, tool_input}` and a `git diff` of that file to a local queue (JSONL or SQLite) and returns immediately, so it never slows Claude down.
3. **Runtime:** **Ollama** (MIT), using native `format` with a JSON schema. If we need GBNF or finer control, switch to **llama.cpp `llama-server`**. Both are OpenAI-compatible, so the client code stays the same.
4. **Model:** **Qwen3.5-9B** (Apache-2.0) as the default, **Qwen3.5-4B** on 8–16 GB machines, and optionally **Qwen3-Coder-30B-A3B** for deep dives on 32 GB+. No VL model. Avoid Qwen2.5-Coder-3B (non-commercial licence).
5. **Grounding pipeline:**
   - Context is limited to the diff hunk plus its enclosing function, found with **tree-sitter-language-pack** (optionally **astchunk** for one or two related chunks).
   - Output goes through a **Pydantic schema plus Instructor**. Each card must quote exact diff lines and line numbers, and a validator rejects any quote that isn't literally in the diff.
   - "Predict the output" and "spot the bug" questions are executed in **llm-sandbox** (Bubblewrap backend) or **Monty**, and the card is dropped if the model's answer doesn't match the real result.
6. **UI:** a **Textual** TUI in a side terminal pane (XP, streaks, multiple choice). Later, reuse Textual's browser serving or a small FastAPI page.
7. **Reuse first:** study and probably fork **DiffDojo** (MIT). It already has the gamification, packs and sandbox, so the main change is to replace its `claude -p` question generator with Ollama + Qwen. Borrow prompts from **socratic-skills** and **block-quiz**.

## Top 5 risks and mitigations

1. **Wrong explanations or quiz answers.** Constrain to a schema, require literal diff quotes, execute answers in a sandbox, and keep only questions that pass. Prefer deterministic question types (output prediction, "which line changed X") over open-ended ones. Add a user "this is wrong" button and log it.
2. **Drift and off-topic content.** Give the model only the diff and its enclosing scope, with no chat history. Use a fixed system prompt, `temperature` ≤ 0.3, and an enum of allowed concept tags. Reject cards whose referenced identifiers don't appear in the diff (string check).
3. **Laptop resource contention and latency.** Claude Code, the IDE and a 9B model compete for RAM. Process the queue asynchronously and batch changes per turn, using the `Stop` hook to process changes once per Claude turn. Use Q4 quantisation, `keep_alive` tuning in Ollama, and fall back to 4B automatically.
4. **Licence and ecosystem churn.** Qwen licences differ by size (for example, 3B is research-only). Ollama and llama.cpp schema support is partial, and Claude Code hooks and output styles change often (several features require specific v2.1.x versions). Pin model and runtime versions, validate JSON ourselves, and re-check licences on each model upgrade.
5. **Executing untrusted generated code, plus user fatigue.** Only run code in a sandbox (no network, temp filesystem, timeout). Never run the user's repo code without consent. Rate-limit cards (for example, at most one per turn, skipping trivial diffs), and make "quiz mode" opt-in rather than blocking Claude.
