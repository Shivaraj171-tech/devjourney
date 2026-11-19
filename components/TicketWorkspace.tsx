"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeEditor from "./CodeEditor";
import HintPanel from "./HintPanel";
import IncidentPanel from "./IncidentPanel";
import Markdown from "./Markdown";
import Quiz from "./Quiz";
import ReviewPanel from "./ReviewPanel";
import SolvedModal from "./SolvedModal";
import TestResults from "./TestResults";
import type { Ticket } from "@/lib/content/types";
import { incidentBonus, incidentXp, quizXp, readTicketXp, solveXp, type TicketXp } from "@/lib/game/rules";
import { actions, ticketProgress, useProgress } from "@/lib/progress/store";
import { PythonRunner } from "@/lib/runner/client";
import type { RunResult } from "@/lib/runner/types";

type Props = {
  ticket: Ticket;
  prevTicketId: string | null;
  nextTicket: { id: string; title: string } | null;
};

type Tab = "ticket" | "hints" | "quiz";

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
    if (noRunner) return;
    const runner = new PythonRunner();
    runnerRef.current = runner;
    runner.warmUp().then(
      () => setPythonState("ready"),
      () => setPythonState("failed"),
    );
    return () => runner.dispose();
  }, [noRunner]);

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

  const runTests = useCallback(async () => {
    const runner = runnerRef.current;
    if (!runner || running) return;
    setRunning(true);
    const files = { ...ticket.starter, ...tp.code };
    const res = await runner.run(files, ticket.tests);
    setResult(res);
    setRunning(false);
    if (res.error) {
      // A timeout restarts Python; show it as loading again until ready.
      setPythonState("loading");
      runner.warmUp().then(() => setPythonState("ready"), () => setPythonState("failed"));
      return;
    }
    const wasSolved = tp.solved;
    const runsAfter = tp.runs + 1;
    actions.recordRun(ticket.id, res.passed, (runs, hints) => passXp(runs, hints).total);
    if (res.passed && !wasSolved) setCelebrate(passXp(runsAfter, tp.hintsUsed));
  }, [running, ticket, tp, passXp]);

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
    <div className="mx-auto grid max-w-[1600px] gap-3 p-3 lg:h-[calc(100vh-3.5rem)] lg:grid-cols-[400px_1fr]">
      {/* ---------- left: ticket / hints / quiz ---------- */}
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="border-b border-slate-800 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">{TYPE_BADGE[ticket.type]}</span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">⏱ ~{ticket.estimatedMinutes} min</span>
            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-cyan-300">New: {ticket.newConcept}</span>
            {tp.solved && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">✔ Merged</span>}
          </div>
          <h1 className="mt-2 text-lg font-bold text-white">
            <span className="text-slate-500">#{ticket.number}</span> {ticket.title}
          </h1>
        </div>
        <div className="flex border-b border-slate-800 text-sm" role="tablist">
          {(["ticket", "hints", "quiz"] as Tab[]).map((t) => {
            if (t === "quiz" && !hasQuiz) return null;
            const label = t === "ticket" ? "📨 Ticket" : t === "hints" ? `💡 Hints (${tp.hintsUsed}/${ticket.hints.length})` : quizUnlocked ? "🧠 Quiz" : "🔒 Quiz";
            return (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`flex-1 px-3 py-2.5 ${tab === t ? "border-b-2 border-violet-400 text-white" : "text-slate-400 hover:text-white"}`}
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
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm">
                <div className="font-semibold text-white">Your task</div>
                {isRead ? (
                  <p className="mt-1 text-slate-400">Read the code on the right, then answer the questions in the <b>Quiz</b> tab. No code changes needed.</p>
                ) : review ? (
                  <p className="mt-1 text-slate-400">Review the pull request on the right. Click every line that has a real problem, then press <b>Submit review</b>. Flagging fine code costs a little XP.</p>
                ) : (
                  <p className="mt-1 text-slate-400">
                    Edit <code className="text-amber-200">{ticket.filesEditable.join(", ")}</code> until every check passes. Then take the quick quiz for bonus XP.
                  </p>
                )}
              </div>
              {isRead && hasQuiz && (
                <button onClick={() => setTab("quiz")} className="w-full rounded-lg bg-violet-600 py-2 font-semibold text-white hover:bg-violet-500">
                  Start the questions →
                </button>
              )}
            </div>
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
          <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950 px-2">
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
            />
          </div>
        </div>
        {!isRead && (
          <div className="max-h-[40%] min-h-[140px] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">CI checks</div>
            <TestResults result={result} running={running} />
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
