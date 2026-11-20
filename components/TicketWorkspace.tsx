"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AskByte from "./AskByte";
import ByteSuggestionCard from "./ByteSuggestion";
import CodeEditor from "./CodeEditor";
import DebuggerPanel from "./DebuggerPanel";
import HintPanel from "./HintPanel";
import IncidentPanel from "./IncidentPanel";
import Markdown from "./Markdown";
import Quiz from "./Quiz";
import ReviewPanel from "./ReviewPanel";
import SolvedModal from "./SolvedModal";
import TestResults from "./TestResults";
import { listChecks } from "@/lib/content/checks";
import type { Ticket } from "@/lib/content/types";
import { incidentBonus, incidentXp, quizXp, readTicketXp, solveXp, type TicketXp } from "@/lib/game/rules";
import { actions, byteActions, ticketProgress, useProgress } from "@/lib/progress/store";
import { PythonRunner } from "@/lib/runner/client";
import { useIsClient } from "@/lib/useIsClient";
import type { RunResult, TestResult, TraceResult } from "@/lib/runner/types";

type Props = {
  ticket: Ticket;
  prevTicketId: string | null;
  nextTicket: { id: string; title: string } | null;
};

type Tab = "ticket" | "learn" | "hints" | "quiz" | "byte";

/** A recorded step-through of one check, and the code it was recorded on. */
type DebugSession = { trace: TraceResult; files: Record<string, string> };

const TYPE_BADGE: Record<string, string> = {
  bug: "🐛 Bug",
  feature: "✨ Feature",
  incident: "🚨 Incident",
  review: "🔍 Code review",
  read: "📖 Code reading",
};

export default function TicketWorkspace({ ticket, prevTicketId, nextTicket }: Props) {
  const progress = useProgress();
  const tp = ticketProgress(progress, ticket.id);
  const isRead = ticket.type === "read";
  const review = ticket.review;
  const noRunner = isRead || !!review; // read and review tickets have no tests to run
  // Progress only exists in the browser; until then we don't know if it's locked.
  const isClient = useIsClient();
  const locked = prevTicketId !== null && !ticketProgress(progress, prevTicketId).solved;

  // ----- files -----
  const editable = useMemo(() => new Set(ticket.filesEditable), [ticket.filesEditable]);
  const codeFiles = Object.keys(ticket.starter).filter((p) => !p.endsWith("__init__.py") || ticket.starter[p].trim());
  const testFiles = ticket.testsVisible ? Object.keys(ticket.tests) : [];
  const firstFile = ticket.filesEditable[0] ?? codeFiles[0];
  const [activeFile, setActiveFile] = useState<string>(firstFile);

  const fileText = useCallback(
    (path: string) => {
      if (path.startsWith("tests/")) return ticket.tests[path.slice("tests/".length)] ?? "";
      return tp.code[path] ?? ticket.starter[path] ?? "";
    },
    [ticket, tp.code],
  );

  // ----- python runner -----
  const runnerRef = useRef<PythonRunner | null>(null);
  const [pythonState, setPythonState] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    // Don't download Python for read/review tickets, locked tickets, or the static HTML.
    if (noRunner || locked || !isClient) return;
    const runner = new PythonRunner();
    runnerRef.current = runner;
    runner.warmUp().then(
      () => setPythonState("ready"),
      () => setPythonState("failed"),
    );
    return () => runner.dispose();
  }, [noRunner, locked, isClient]);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [celebrate, setCelebrate] = useState<TicketXp | null>(null);

  // XP for getting every check green. Incidents add a speed bonus if fixed in time.
  const passXp = useCallback(
    (runs: number, hints: number): TicketXp => {
      if (!ticket.incident || !tp.incidentStartedAt) return solveXp(ticket.level, hints, runs);
      const bonus = incidentBonus(new Date(tp.incidentStartedAt).getTime(), Date.now(), ticket.incident.timeLimitMinutes);
      return incidentXp(ticket.level, hints, runs, bonus);
    },
    [ticket, tp.incidentStartedAt],
  );
  const [tab, setTab] = useState<Tab>("ticket");

  // ----- step-through debugger -----
  const [debug, setDebug] = useState<DebugSession | null>(null);
  const [debugPos, setDebugPos] = useState(0);
  const [tracing, setTracing] = useState<string | null>(null);
  const [traceError, setTraceError] = useState<string | null>(null);

  // A timeout restarts Python; show it as loading again until ready.
  const restartPython = useCallback((runner: PythonRunner) => {
    setPythonState("loading");
    runner.warmUp().then(() => setPythonState("ready"), () => setPythonState("failed"));
  }, []);

  const runTests = useCallback(async () => {
    const runner = runnerRef.current;
    if (!runner || running || tracing) return;
    setRunning(true);
    setDebug(null);
    setTraceError(null);
    const files = { ...ticket.starter, ...tp.code };
    const res = await runner.run(files, ticket.tests);
    setResult(res);
    setRunning(false);
    if (res.error) {
      restartPython(runner);
      return;
    }
    const wasSolved = tp.solved;
    const runsAfter = tp.runs + 1;
    actions.recordRun(ticket.id, res.passed, (runs, hints) => passXp(runs, hints).total);
    if (res.passed && !wasSolved) setCelebrate(passXp(runsAfter, tp.hintsUsed));
  }, [running, tracing, ticket, tp, passXp, restartPython]);

  /** Move the debugger to a step, and show the file that step is in. */
  const goToStep = useCallback(
    (trace: TraceResult, position: number) => {
      const clamped = Math.max(0, Math.min(position, trace.steps.length));
      setDebugPos(clamped);
      const step = trace.steps[Math.min(clamped, trace.steps.length - 1)];
      if (step && step.file in ticket.starter) setActiveFile(step.file);
    },
    [ticket.starter],
  );

  const stepThrough = useCallback(
    async (check: TestResult) => {
      const runner = runnerRef.current;
      if (!runner || running || tracing) return;
      setTracing(`${check.file}:${check.name}`);
      setTraceError(null);
      const files = { ...ticket.starter, ...tp.code };
      const out = await runner.trace(files, ticket.tests, check.file, check.name);
      setTracing(null);
      if (out.error !== undefined) {
        setTraceError(out.error);
        restartPython(runner);
        return;
      }
      setDebug({ trace: out.trace, files });
      goToStep(out.trace, 0);
    },
    [running, tracing, ticket, tp.code, goToStep, restartPython],
  );
  const debugStep = debug ? debug.trace.steps[Math.min(debugPos, debug.trace.steps.length - 1)] : undefined;
  const debugStale = !!debug && Object.keys(debug.files).some((path) => debug.files[path] !== (tp.code[path] ?? ticket.starter[path]));

  // Ctrl/Cmd + Enter runs the tests.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !noRunner) {
        e.preventDefault();
        runTests();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runTests, noRunner]);

  const quizUnlocked = isRead || tp.solved;
  const hasQuiz = ticket.questions.length > 0;

  if (!isClient) {
    return <div className="p-8 text-center text-slate-500">Opening ticket…</div>;
  }

  if (locked) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-4 text-2xl font-bold text-white">This ticket is still in the backlog</h1>
        <p className="mt-2 text-slate-400">Finish the previous ticket first. Maya likes one thing at a time.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href={`/ticket/${prevTicketId}`} className="rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-500">
            Go to previous ticket
          </Link>
          <Link href="/" className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800">
            Back to the office
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-[minmax(0,1fr)] gap-3 p-3 lg:h-[calc(100vh-3.5rem)] lg:grid-cols-[400px_minmax(0,1fr)]">
      {/* ---------- left: ticket / hints / quiz ---------- */}
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="border-b border-slate-800 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">{TYPE_BADGE[ticket.type]}</span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">⏱ ~{ticket.estimatedMinutes} min</span>
            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-cyan-300">New: {ticket.newConcept}</span>
            {tp.solved && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                {review ? "✔ Reviewed" : isRead ? "✔ Done" : ticket.type === "incident" ? "✔ Resolved" : "✔ Merged"}
              </span>
            )}
          </div>
          <h1 className="mt-2 text-lg font-bold text-white">
            <span className="text-slate-500">#{ticket.number}</span> {ticket.title}
          </h1>
        </div>
        <div className={`flex overflow-x-auto border-b border-slate-800 ${ticket.byte?.prompt ? "text-[13px]" : "text-sm"}`} role="tablist">
          {(["ticket", "learn", "hints", "quiz", "byte"] as Tab[]).map((t) => {
            if (t === "quiz" && !hasQuiz) return null;
            if (t === "learn" && !ticket.concept) return null;
            // On review tickets the prompt card could hint at the bug, so it opens after the review.
            if (t === "byte" && (!ticket.byte?.prompt || (review && !tp.solved))) return null;
            const label = t === "byte" ? "💬 Ask Byte" : t === "ticket" ? "📨 Ticket" : t === "learn" ? "📘 Learn" : t === "hints" ? `💡 Hints (${tp.hintsUsed}/${ticket.hints.length})` : quizUnlocked ? "🧠 Quiz" : "🔒 Quiz";
            return (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`flex-1 ${ticket.byte?.prompt ? "px-2" : "px-3"} py-2.5 whitespace-nowrap ${tab === t ? "border-b-2 border-violet-400 text-white" : "text-slate-400 hover:text-white"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 text-slate-300">
          {tab === "ticket" && (
            <div className="space-y-4">
              <Markdown text={ticket.story} />
              {ticket.byte?.suggestion && !noRunner && (
                <ByteSuggestionCard
                  ticketId={ticket.id}
                  suggestion={ticket.byte.suggestion}
                  tp={tp}
                  currentText={fileText(ticket.byte.suggestion.file)}
                  autocomplete={ticket.seasonId === "s01"}
                  onApplied={setActiveFile}
                />
              )}
              {ticket.concept && (
                <button
                  onClick={() => setTab("learn")}
                  className="w-full rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-left text-sm text-cyan-100 hover:bg-cyan-500/20"
                >
                  📘 New to <b>{ticket.newConcept}</b>? Read the 2-minute lesson first →
                </button>
              )}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm">
                <div className="font-semibold text-white">Your task</div>
                {isRead ? (
                  <p className="mt-1 text-slate-400">Read the code in the editor, then answer the questions in the <b>Quiz</b> tab. No code changes needed.</p>
                ) : review ? (
                  <p className="mt-1 text-slate-400">Review the pull request in the code panel. Click every line that has a real problem, then press <b>Submit review</b>. Flagging fine code costs a little XP.</p>
                ) : (
                  <>
                    <p className="mt-1 text-slate-400">
                      Edit <code className="text-amber-200">{ticket.filesEditable.join(", ")}</code> until every check passes. Then take the quick quiz for bonus XP.
                    </p>
                    <AcceptanceChecklist tests={ticket.tests} result={result} solved={tp.solved} />
                  </>
                )}
              </div>
              {isRead && hasQuiz && (
                <button onClick={() => setTab("quiz")} className="w-full rounded-lg bg-violet-600 py-2 font-semibold text-white hover:bg-violet-500">
                  Start the questions →
                </button>
              )}
            </div>
          )}
          {tab === "learn" && ticket.concept && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">New concept for this ticket. Read it first if it&apos;s unfamiliar (free, no XP cost).</p>
              <Markdown text={ticket.concept} />
              <button onClick={() => setTab("ticket")} className="w-full rounded-lg border border-slate-700 py-2 text-sm text-slate-300 hover:bg-slate-800">
                ← Back to the ticket
              </button>
            </div>
          )}
          {tab === "byte" && ticket.byte?.prompt && (
            <AskByte card={ticket.byte.prompt} record={tp.bytePrompt} onPick={(i, best) => byteActions.pickPrompt(ticket.id, i, best)} />
          )}
          {tab === "hints" && (
            <HintPanel hints={ticket.hints} revealed={tp.hintsUsed} solved={tp.solved} onReveal={() => actions.revealHint(ticket.id)} />
          )}
          {tab === "quiz" &&
            (quizUnlocked ? (
              <Quiz
                questions={ticket.questions}
                firstPicks={tp.quizFirstPick}
                done={tp.quizDone}
                intro={isRead ? "Answer every question correctly to close this ticket." : "Check your understanding. Each answer right on the first try is +15 XP."}
                onAnswer={(i, c) => actions.answerQuestion(ticket.id, i, c, ticket.questions.length)}
                onComplete={(firstTry) => {
                  if (isRead) {
                    const xp = readTicketXp(ticket.level, firstTry, ticket.questions.length, tp.hintsUsed);
                    actions.finishQuiz(ticket.id, quizXp(0), firstTry, xp);
                    setCelebrate({ base: xp, hintPenalty: 0, firstRunBonus: 0, total: xp });
                  } else {
                    actions.finishQuiz(ticket.id, quizXp(firstTry), firstTry);
                  }
                }}
              />
            ) : (
              <p className="text-sm text-slate-400">🔒 Get all checks passing to unlock the quiz.</p>
            ))}
        </div>
        {tp.solved && nextTicket && (
          <Link
            href={`/ticket/${nextTicket.id}`}
            className="m-3 rounded-lg bg-emerald-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-emerald-500"
          >
            Next ticket: {nextTicket.title} →
          </Link>
        )}
      </aside>

      {/* ---------- right: pull request (review tickets) or IDE + checks ---------- */}
      {review ? (
        <ReviewPanel ticket={{ ...ticket, review }} tp={tp} onSolved={setCelebrate} />
      ) : (
      <section className="flex min-h-[600px] flex-col gap-3 lg:min-h-0">
        {ticket.incident && <IncidentPanel ticketId={ticket.id} incident={ticket.incident} tp={tp} />}
        <div className="flex min-h-[380px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#1e1e1e]">
          <div className="flex flex-wrap items-center border-b border-slate-800 bg-slate-950 px-2">
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {[...codeFiles, ...testFiles.map((t) => `tests/${t}`)].map((path) => {
              const canEdit = !isRead && editable.has(path);
              return (
                <button
                  key={path}
                  onClick={() => setActiveFile(path)}
                  className={`shrink-0 border-b-2 px-3 py-2 font-mono text-xs ${
                    activeFile === path ? "border-cyan-400 text-white" : "border-transparent text-slate-400 hover:text-white"
                  }`}
                  title={canEdit ? "You can edit this file" : "Read-only"}
                >
                  {canEdit ? "✏️ " : "🔒 "}
                  {path}
                </button>
              );
            })}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2 py-1.5 pl-2">
              {!isRead && editable.has(activeFile) && (
                <button
                  onClick={() => {
                    if (confirm("Reset your changes to this ticket's starting code?")) actions.resetCode(ticket.id);
                  }}
                  className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  ↺ Reset
                </button>
              )}
              {!isRead && (
                <button
                  data-testid="run-tests"
                  onClick={runTests}
                  disabled={running || pythonState !== "ready"}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {pythonState === "loading" ? "Starting Python…" : pythonState === "failed" ? "Python failed to load" : running ? "Running…" : "▶ Run tests"}
                </button>
              )}
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <CodeEditor
              path={`file:///${ticket.id}/${activeFile}`}
              value={fileText(activeFile)}
              readOnly={isRead || !editable.has(activeFile)}
              onChange={(v) => actions.saveCode(ticket.id, activeFile, v)}
              onRun={isRead ? undefined : runTests}
              highlightLine={debugStep && debugStep.file === activeFile ? debugStep.line : undefined}
            />
          </div>
        </div>
        {!isRead && debug && (
          <div className="max-h-[55%] min-h-[220px] overflow-y-auto rounded-2xl border border-violet-500/40 bg-slate-900/70 p-4">
            <DebuggerPanel
              trace={debug.trace}
              position={debugPos}
              onPosition={(pos) => goToStep(debug.trace, pos)}
              onClose={() => setDebug(null)}
              stale={debugStale}
            />
          </div>
        )}
        {!isRead && !debug && (
          <div className="max-h-[40%] min-h-[140px] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">CI checks</div>
            {traceError && (
              <div data-testid="trace-error" className="mb-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                ⚠️ Couldn&apos;t step through that check: {traceError}
              </div>
            )}
            <TestResults result={result} running={running} onStepThrough={pythonState === "ready" ? stepThrough : undefined} tracing={tracing} />
          </div>
        )}
      </section>
      )}

      {celebrate && (
        <SolvedModal
          xp={celebrate}
          isRead={isRead}
          variant={ticket.type}
          hasQuiz={hasQuiz && !isRead}
          nextTicket={nextTicket}
          onQuiz={() => {
            setCelebrate(null);
            setTab("quiz");
          }}
          onClose={() => setCelebrate(null)}
        />
      )}
    </div>
  );
}

/** "Done when" list built from the ticket's test names, ticked from the latest run. */
function AcceptanceChecklist({ tests, result, solved }: { tests: Record<string, string>; result: RunResult | null; solved: boolean }) {
  const checks = listChecks(tests);
  if (checks.length === 0) return null;
  const status = new Map(result?.results.map((r) => [`${r.file}:${r.name}`, r.status]) ?? []);
  // If code failed to load, no individual check ran: show them all as failing.
  const loadFailed = result?.results.some((r) => r.name === "(import)") ?? false;
  return (
    <div className="mt-3">
      <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Done when</div>
      <ul className="mt-1 space-y-1" data-testid="acceptance-checklist">
        {checks.map((c) => {
          const s = solved && !result ? "pass" : (status.get(`${c.file}:${c.name}`) ?? (loadFailed ? "error" : undefined));
          return (
            <li key={`${c.file}:${c.name}`} className="flex gap-2 text-slate-300">
              <span>{s === "pass" ? "✅" : s ? "❌" : "⬜"}</span>
              <span>{c.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
