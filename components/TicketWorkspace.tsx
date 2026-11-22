"use client";
// The ticket page.
//
// Desktop (≥1024px): two columns. Left, the brief: goal first ("Your task" +
// "Done when"), then Byte's suggestion, the story (2 lines + Read more) and the
// 2-minute lesson. On the first visit to a ticket the story comes before Byte,
// unfolded, and Byte's card stays folded to a teaser until the first test run
// (so the first call is made with evidence). Right, the editor with a feedback
// strip (Run · check pill · hints) and the CI checks (or the debugger) under it.
//
// Phone (<1024px): the same pieces as a 3-step flow (Brief / Code / Checks)
// with Run in a sticky bottom bar. Running switches to Checks.
import { conceptLabel } from "@/lib/content/concepts";
import TaskFormats from "./TaskFormats";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import AskByte from "./AskByte";
import BountyReveal from "./BountyReveal";
import ByteSuggestionCard, { ByteTeaser } from "./ByteSuggestion";
import CodeEditor from "./CodeEditor";
import DebuggerPanel from "./DebuggerPanel";
import { HintsButton } from "./HintPanel";
import IncidentPanel, { LogsChip } from "./IncidentPanel";
import LabViewer from "./LabViewer";
import Markdown from "./Markdown";
import Quiz from "./Quiz";
import ReviewPanel from "./ReviewPanel";
import SolvedModal from "./SolvedModal";
import Tabs, { tabPanelProps, type TabItem } from "./Tabs";
import TestResults, { CheckPill } from "./TestResults";
import { listChecks } from "@/lib/content/checks";
import type { Ticket } from "@/lib/content/types";
import { checkReview, incidentBonus, incidentXp, quizXp, readTicketXp, solveXp, type TicketXp } from "@/lib/game/rules";
import { actions, byteActions, ticketProgress, useProgress, visitActions } from "@/lib/progress/store";
import { PythonRunner } from "@/lib/runner/client";
import { useIsClient } from "@/lib/useIsClient";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import type { RunResult, TestResult, TraceResult } from "@/lib/runner/types";
// Personalization (coding profile): run log, adaptive help, Byte nudge.
import { codeRunActions } from "@/lib/progress/store";
import AdaptiveHelpCard from "./AdaptiveHelp";
import ByteTrustNudge from "./ByteTrustNudge";

type Props = {
  ticket: Ticket;
  prevTicketId: string | null;
  nextTicket: { id: string; title: string } | null;
};

/** Left-pane tabs. The lesson and the hints are no longer tabs (see the brief and the run bar). */
type Tab = "ticket" | "quiz" | "byte";
/** Phone steps. On review tickets "code" is the pull request. */
type Step = "brief" | "code" | "checks";

/** A recorded step-through of one check, and the code it was recorded on. */
type DebugSession = { trace: TraceResult; files: Record<string, string> };

const TYPE_BADGE: Record<string, string> = {
  bug: "🐛 Bug",
  feature: "✨ Feature",
  incident: "🚨 Incident",
  review: "🔍 Code review",
  read: "📖 Code reading",
};

const passCount = (r: RunResult) => r.results.filter((x) => x.status === "pass").length;

/** On a phone only the current step shows; on desktop everything does. */
const stepClass = (visible: boolean, display: "flex" | "block" = "flex") =>
  display === "flex" ? (visible ? "flex lg:flex" : "hidden lg:flex") : visible ? "block lg:block" : "hidden lg:block";

export default function TicketWorkspace({ ticket, prevTicketId, nextTicket }: Props) {
  const progress = useProgress();
  const tp = ticketProgress(progress, ticket.id);
  const isRead = ticket.type === "read";
  const review = ticket.review;
  const noRunner = isRead || !!review; // read and review tickets have no tests to run
  // Final exam (season.yaml `final: true`): no hints, no lesson, no Byte, no concept chip. CI checks stay.
  const exam = ticket.final === true;
  // Bug Bounty side quest: a mystery bug, so no concept chip and no lesson (revealed once solved).
  const bounty = ticket.bounty;
  // Side floor (the Robotics Lab): opens as a whole after a story floor; runs can draw in the Lab viewer.
  const sideFloor = ticket.sideFloor;
  // Progress only exists in the browser; until then we don't know if it's locked.
  const isClient = useIsClient();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const locked = prevTicketId !== null && !ticketProgress(progress, prevTicketId).solved;

  // ----- first visit: the story leads, Byte waits for evidence -----
  // Decided once per page visit (the "opened" mark below would flip it mid-visit).
  const [firstVisit, setFirstVisit] = useState<boolean | null>(null);
  if (isClient && !locked && firstVisit === null) {
    setFirstVisit(!progress.openedTickets?.includes(ticket.id) && tp.runs === 0 && !tp.solved && !tp.byteSuggestion);
  }
  useEffect(() => {
    if (isClient && !locked) visitActions.opened(ticket.id);
  }, [isClient, locked, ticket.id]);
  const [bytePeeked, setBytePeeked] = useState(false);
  const byteShown = !firstVisit || bytePeeked || tp.runs > 0 || tp.solved || !!tp.byteSuggestion;
  // Phone: while stepping through, the editor shrinks to its code so the debugger sits right under it.
  const [codeHeight, setCodeHeight] = useState<number | null>(null);

  // ----- files -----
  const editable = useMemo(() => new Set(ticket.filesEditable), [ticket.filesEditable]);
  const codeFiles = Object.keys(ticket.starter).filter((p) => !p.endsWith("__init__.py") || ticket.starter[p].trim());
  const testFiles = ticket.testsVisible ? Object.keys(ticket.tests) : [];
  const allFiles = [...codeFiles, ...testFiles.map((t) => `tests/${t}`)];
  // Editable files first, so "which file do I fix?" is never scrolled out of view.
  const editableFiles = isRead ? [] : ticket.filesEditable.filter((p) => allFiles.includes(p));
  const otherFiles = allFiles.filter((p) => !editableFiles.includes(p));
  const firstFile = ticket.filesEditable[0] ?? codeFiles[0];
  const [activeFile, setActiveFile] = useState<string>(firstFile);
  const [showOtherFiles, setShowOtherFiles] = useState(false);

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
  // Checks passing per completed run, for the "+1 since last run" chip.
  const [passHistory, setPassHistory] = useState<number[]>([]);
  const previousPassed = result && !result.error && passHistory.length > 1 ? passHistory[passHistory.length - 2] : undefined;
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
  const [step, setStep] = useState<Step>("brief");
  // Phone: Monaco (~4 MB) loads the first time the Code step opens, not while reading the brief.
  const [editorLoaded, setEditorLoaded] = useState(false);

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
    setStep("checks"); // phone: show the results, not the keyboard
    const files = { ...ticket.starter, ...tp.code };
    const res = await runner.run(files, ticket.tests);
    codeRunActions.logRun(ticket.id, res, files, listChecks(ticket.tests).length); // coding profile: no code stored
    if (!res.error) setPassHistory((h) => [...h, passCount(res)]);
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
  }, [running, tracing, ticket, tp, passXp, restartPython, setCelebrate]);

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
      codeRunActions.steppedThrough(ticket.id); // coding profile
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
      setStep("code"); // phone: the highlighted line is in the editor
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
  const checks = useMemo(() => listChecks(ticket.tests), [ticket.tests]);

  if (!isClient) {
    return <div className="p-8 text-center text-slate-400">Opening ticket…</div>;
  }

  if (locked) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-4 text-2xl font-bold text-white">This ticket is still in the backlog</h1>
        <p className="mt-2 text-slate-400">
          {bounty
            ? "This bounty opens once you've solved the ticket that teaches what you need for it."
            : sideFloor && ticket.number === 1
              ? `The ${sideFloor.title} opens once you've finished the floor it builds on.`
              : "Finish the previous ticket first. Maya likes one thing at a time."}
        </p>
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

  // ----- left-pane tabs: only what's useful right now -----
  const tabs: TabItem<Tab>[] = [{ id: "ticket", label: "📨 Ticket" }];
  // The quiz is part of the "after merge" flow (read tickets: it *is* the task).
  if (hasQuiz && quizUnlocked) tabs.push({ id: "quiz", label: tp.quizDone ? "🧠 Quiz ✓" : "🧠 Quiz" });
  // On review tickets the prompt card could hint at the bug, so it opens after the review.
  if (ticket.byte?.prompt && !exam && !(review && !tp.solved)) tabs.push({ id: "byte", label: "💬 Ask Byte" });
  const activeTab: Tab = tabs.some((t) => t.id === tab) ? tab : "ticket";
  const openQuiz = () => {
    setTab("quiz");
    setStep("brief");
  };

  // ----- phone steps -----
  const steps: TabItem<Step>[] = [{ id: "brief", label: "1 · Brief" }];
  if (review) steps.push({ id: "code", label: "2 · Pull request" });
  else {
    steps.push({ id: "code", label: "2 · Code" });
    if (!isRead) {
      const passed = result && !result.error ? (result.passed ? checks.length : passCount(result)) : null;
      steps.push({ id: "checks", label: <>3 · Checks{passed !== null && <span className="ml-1 tabular-nums opacity-80">{passed}/{checks.length}</span>}</> });
    }
  }
  const phoneStep: Step = steps.some((s) => s.id === step) ? step : "brief";
  const showEditor = editorLoaded || isDesktop || phoneStep === "code";
  if (showEditor && !editorLoaded) setEditorLoaded(true); // once loaded, keep it (undo history)
  const stepPanel = (id: Step) => (isDesktop ? {} : tabPanelProps("step", id));

  const hints = (placement: "up" | "down") => exam ? null : (
    <HintsButton placement={placement} hints={ticket.hints} revealed={tp.hintsUsed} solved={tp.solved} onReveal={() => actions.revealHint(ticket.id)} />
  );
  const incident = ticket.incident && <IncidentPanel ticketId={ticket.id} incident={ticket.incident} tp={tp} logsOpenAtStart={isDesktop} />;

  // ----- "Your task": the first thing in the brief -----
  let task: ReactNode;
  if (isRead) {
    task = (
      <>
        <p className="mt-1 text-slate-300">Read the code, then answer the questions. No code changes needed.</p>
        {hasQuiz && (
          <div className="mt-3 flex items-center gap-2">
            <button onClick={openQuiz} className="flex-1 rounded-lg bg-violet-600 py-2 font-semibold text-white hover:bg-violet-500">
              {tp.quizDone ? "See your answers →" : "Start the questions →"}
            </button>
            {hints("down")}
          </div>
        )}
      </>
    );
  } else if (review) {
    const total = review.issues.length;
    const found = tp.solved ? total : tp.reviewSubmitted ? checkReview(tp.reviewSubmitted, review.issues).found.length : 0;
    task = (
      <>
        <p className="mt-1 text-slate-300">
          Review {review.author}&apos;s pull request. Tap every line that has a real problem, then press <b className="text-white">Submit review</b>. Flagging fine
          code costs a little XP.
        </p>
        <p className="mt-2 text-sm font-semibold text-violet-200" data-testid="review-progress">
          🚩 {found}/{total} problem{total === 1 ? "" : "s"} found
        </p>
      </>
    );
  } else {
    task = (
      <>
        <p className="mt-1 text-slate-300">
          Edit{" "}
          {editableFiles.map((p, i) => (
            <span key={p}>
              {i > 0 && ", "}
              <code className="text-amber-200">{p}</code>
            </span>
          ))}{" "}
          until every check passes.
        </p>
        <AcceptanceChecklist checks={checks} result={result} solved={tp.solved} />
      </>
    );
  }

  return (
    <div
      className={`ticket-page mx-auto grid max-w-[1600px] grid-cols-[minmax(0,1fr)] content-start gap-3 p-3 lg:h-[calc(100vh-3.5rem)] lg:grid-cols-[400px_minmax(0,1fr)] lg:content-stretch ${
        noRunner ? "" : "pb-24 lg:pb-3"
      }`}
    >
      {/* ---------- phone: Brief / Code / Checks ---------- */}
      <div className="sticky top-14 z-20 -mx-3 -mt-3 border-b border-slate-800 bg-slate-950/95 px-3 py-2 backdrop-blur lg:hidden">
        <Tabs
          tabs={steps}
          active={phoneStep}
          onChange={setStep}
          idPrefix="step"
          label="Ticket steps"
          className="flex gap-1 rounded-xl bg-slate-900 p-1"
          tabClassName={(on) =>
            `flex-1 rounded-lg px-2 py-2 text-sm font-semibold whitespace-nowrap ${on ? "bg-violet-600 text-white shadow" : "text-slate-300 hover:text-white"}`
          }
        />
      </div>

      {/* ---------- left: the brief ---------- */}
      <aside
        {...stepPanel("brief")}
        aria-label="Ticket brief"
        className={`${stepClass(phoneStep === "brief")} min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70`}
      >
        <div className="border-b border-slate-800 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">{TYPE_BADGE[ticket.type]}</span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">⏱ ~{ticket.estimatedMinutes} min</span>
            {!exam && !bounty && <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-cyan-300">New: {conceptLabel(ticket.newConcept)}</span>}
            {bounty && <span className="rounded-full bg-lime-500/10 px-2 py-0.5 text-lime-200">🐞 Mystery bug</span>}
            {sideFloor && (
              <span data-testid="side-floor-chip" className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-200">
                {sideFloor.icon} {sideFloor.title}
              </span>
            )}
            {tp.solved && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                {review ? "✔ Reviewed" : isRead ? "✔ Done" : ticket.type === "incident" ? "✔ Resolved" : "✔ Merged"}
              </span>
            )}
          </div>
          <h1 className="mt-2 text-lg font-bold text-white">
            <span className="text-slate-400">#{ticket.number}</span> {ticket.title}
          </h1>
          {exam && <ExamBanner />}
          {bounty && <BountyReveal bounty={bounty} solved={tp.solved} />}
        </div>
        {tabs.length > 1 && (
          <Tabs
            tabs={tabs}
            active={activeTab}
            onChange={setTab}
            idPrefix="pane"
            label="Ticket sections"
            className="flex border-b border-slate-800 text-sm"
            tabClassName={(on) =>
              `flex-1 border-b-2 px-3 py-2.5 whitespace-nowrap ${on ? "border-violet-400 text-white" : "border-transparent text-slate-300 hover:text-white"}`
            }
          />
        )}
        <div {...(tabs.length > 1 ? tabPanelProps("pane", activeTab) : {})} className="min-h-0 flex-1 overflow-y-auto p-4 text-slate-300">
          {activeTab === "ticket" && (
            <div className="space-y-4">
              {/* Phone: the incident banner and its clock belong to the brief, so the urgency lands first. */}
              {!isDesktop && incident}

              {/* 1. The goal, always first. */}
              <section data-testid="ticket-goal" aria-labelledby="goal-title" className="rounded-xl border border-violet-400/30 bg-slate-950/70 p-3 text-sm">
                <h2 id="goal-title" className="font-semibold text-white">
                  🎯 Your task
                </h2>
                {task}
                {tp.solved && !isRead && hasQuiz && !tp.quizDone && (
                  <button onClick={openQuiz} className="mt-3 w-full rounded-lg border border-violet-400/50 py-2 font-semibold text-violet-100 hover:bg-violet-500/15">
                    🧠 Lock it in: take the 1-minute quiz →
                  </button>
                )}
                {!review && !isDesktop && (
                  <button
                    data-testid="goto-code"
                    onClick={() => setStep("code")}
                    className="mt-3 w-full rounded-lg border border-slate-600 py-2 font-semibold text-slate-100 hover:bg-slate-800"
                  >
                    Open the code →
                  </button>
                )}
                {review && !isDesktop && (
                  <button
                    data-testid="goto-code"
                    onClick={() => setStep("code")}
                    className="mt-3 w-full rounded-lg bg-violet-600 py-2 font-semibold text-white hover:bg-violet-500"
                  >
                    Open the pull request →
                  </button>
                )}
              </section>

              {/* First visit: the story, unfolded, before anything else is asked of the learner. */}
              {firstVisit && <Story text={ticket.story} defaultOpen />}

              {/* 2. Byte's suggestion, right under the goal (folded until the first run on a first visit). */}
              {ticket.byte?.suggestion && !noRunner && !exam && <ByteTrustNudge tp={tp} />}
              {ticket.byte?.suggestion && !noRunner && !exam && (byteShown ? (
                <ByteSuggestionCard
                  ticketId={ticket.id}
                  suggestion={ticket.byte.suggestion}
                  tp={tp}
                  currentText={fileText(ticket.byte.suggestion.file)}
                  autocomplete={ticket.seasonId === "s01"}
                  tutorial={ticket.tutorial === true}
                  onApplied={(path) => {
                    setActiveFile(path);
                    setStep("code");
                  }}
                />
              ) : (
                <ByteTeaser autocomplete={ticket.seasonId === "s01"} onOpen={() => setBytePeeked(true)} />
              ))}

              {/* 3. Practice formats from formats.yaml: predict the output, break Byte's
                  code, put the lines in order. Renders nothing for tickets without them. */}
              {!exam && <TaskFormats ticket={ticket} tp={tp} getRunner={() => runnerRef.current} />}

              {/* 4. The story, folded to two lines (after the first visit). */}
              {!firstVisit && <Story text={ticket.story} />}

              {/* 5. The lesson, folded. */}
              {ticket.concept && !exam && !bounty && <Lesson concept={ticket.concept} newConcept={ticket.newConcept} deep={ticket.deepLesson === true} />}
            </div>
          )}
          {activeTab === "byte" && ticket.byte?.prompt && (
            <AskByte card={ticket.byte.prompt} record={tp.bytePrompt} onPick={(i, best) => byteActions.pickPrompt(ticket.id, i, best)} />
          )}
          {activeTab === "quiz" && (
            <Quiz
              seed={ticket.id}
              questions={ticket.questions}
              firstPicks={tp.quizFirstPick}
              done={tp.quizDone}
              intro={isRead ? "Answer every question correctly to close this ticket." : "Lock in what you just fixed. Each answer right on the first try is +15 XP."}
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
          )}
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
        <div {...stepPanel("code")} className={`${stepClass(phoneStep === "code")} min-h-0 min-w-0 flex-col`}>
          <ReviewPanel ticket={{ ...ticket, review }} tp={tp} onSolved={setCelebrate} actions={hints("up")} />
        </div>
      ) : (
        <section className="flex min-h-0 min-w-0 flex-col gap-3">
          {isDesktop && incident && <div className="shrink-0">{incident}</div>}
          {/* Phone: the logs are in the Brief step; a chip keeps them one tap away while coding. */}
          {!isDesktop && ticket.incident && phoneStep === "code" && <LogsChip logs={ticket.incident.logs} />}
          <div
            {...stepPanel("code")}
            className={`${stepClass(phoneStep === "code")} h-[calc(100dvh-13rem)] min-h-[320px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#1e1e1e] lg:h-auto lg:flex-1 ${
              ticket.incident ? "lg:min-h-[240px]" : "lg:min-h-[380px]"
            }`}
            // Phone + debugger: just tall enough for the code (tab bar ~37px), so the debugger isn't a screen away.
            style={!isDesktop && debug && codeHeight ? { height: `min(calc(100dvh - 13rem), ${Math.max(160, codeHeight + 38)}px)`, minHeight: 0 } : undefined}
            data-testid="code-panel"
          >
            <div className="flex items-center border-b border-slate-800 bg-slate-950 px-2">
              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                {[...editableFiles, ...otherFiles.filter((p) => isRead || editableFiles.length === 0 || showOtherFiles || p === activeFile)].map((path) => {
                  const canEdit = editableFiles.includes(path);
                  return (
                    <button
                      key={path}
                      data-testid="file-tab"
                      data-editable={canEdit}
                      onClick={() => setActiveFile(path)}
                      aria-pressed={activeFile === path}
                      className={`shrink-0 border-b-2 px-3 py-2 font-mono text-xs ${
                        activeFile === path ? "border-cyan-400 text-white" : `border-transparent ${canEdit ? "text-amber-100" : "text-slate-400"} hover:text-white`
                      }`}
                      title={canEdit ? "You can edit this file" : "Read-only"}
                    >
                      {canEdit ? "✏️ " : "🔒 "}
                      {path}
                    </button>
                  );
                })}
                {!isRead && editableFiles.length > 0 && otherFiles.length > 0 && (
                  <button
                    data-testid="toggle-other-files"
                    onClick={() => setShowOtherFiles((v) => !v)}
                    aria-expanded={showOtherFiles}
                    className="shrink-0 rounded-md px-2 py-1 text-xs whitespace-nowrap text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    {showOtherFiles ? "Hide read-only files" : `🔒 +${otherFiles.length} read-only file${otherFiles.length === 1 ? "" : "s"}`}
                  </button>
                )}
              </div>
              {!isRead && editable.has(activeFile) && (
                <button
                  onClick={() => {
                    if (confirm("Reset your changes to this ticket's starting code?")) actions.resetCode(ticket.id);
                  }}
                  className="ml-1 shrink-0 rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  ↺ Reset
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1">
              {showEditor && (
                <CodeEditor
                  path={`file:///${ticket.id}/${activeFile}`}
                  value={fileText(activeFile)}
                  readOnly={isRead || !editable.has(activeFile)}
                  onChange={(v) => actions.saveCode(ticket.id, activeFile, v)}
                  onRun={isRead ? undefined : runTests}
                  highlightLine={debugStep && debugStep.file === activeFile ? debugStep.line : undefined}
                  compact={!isDesktop}
                  onContentHeight={isDesktop ? undefined : setCodeHeight}
                />
              )}
            </div>
          </div>

          {/* Run · progress · hints. Phone: a sticky bottom bar. Desktop: a strip under the editor. */}
          {!isRead && (
            <div
              data-testid="run-bar"
              className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-slate-800 bg-slate-950/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:z-auto lg:rounded-2xl lg:border lg:bg-slate-900/70 lg:py-2 lg:backdrop-blur-none"
            >
              <button
                data-testid="run-tests"
                onClick={runTests}
                disabled={running || pythonState !== "ready"}
                className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                {pythonState === "loading" ? "Starting Python…" : pythonState === "failed" ? "Python failed to load" : running ? "Running…" : "▶ Run tests"}
              </button>
              <CheckPill total={checks.length} result={result} previousPassed={previousPassed} />
              <div className="ml-auto">{hints("up")}</div>
            </div>
          )}

          {!isRead && debug && (
            <div
              className={`${stepClass(phoneStep === "code" || phoneStep === "checks", "block")} max-h-[55%] min-h-[220px] overflow-y-auto rounded-2xl border border-violet-500/40 bg-slate-900/70 p-4 max-lg:max-h-none`}
            >
              <DebuggerPanel
                trace={debug.trace}
                position={debugPos}
                onPosition={(pos) => goToStep(debug.trace, pos)}
                onClose={() => setDebug(null)}
                stale={debugStale}
                files={debug.files}
              />
            </div>
          )}
          {!isRead && !debug && (
            <div
              {...stepPanel("checks")}
              className={`${stepClass(phoneStep === "checks", "block")} ${result?.viz ? "max-h-[62%]" : "max-h-[40%]"} min-h-[140px] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-4 max-lg:max-h-none`}
            >
              <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">CI checks</h2>
              {traceError && (
                <div data-testid="trace-error" className="mb-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                  ⚠️ Couldn&apos;t step through that check: {traceError}
                </div>
              )}
              <AdaptiveHelpCard ticket={ticket} tp={tp} result={result} onStepThrough={pythonState === "ready" ? stepThrough : undefined} onShowBrief={() => setStep("brief")} />
              <TestResults result={result} running={running} onStepThrough={pythonState === "ready" ? stepThrough : undefined} tracing={tracing} />
              {/* Robotics Lab: what the run drew (`from lab import viz`), under the checks. A new run replays it. */}
              {!running && result?.viz && <LabViewer key={passHistory.length} items={result.viz} />}
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
          reveal={bounty ? <BountyReveal bounty={bounty} solved compact /> : undefined}
          onQuiz={() => {
            setCelebrate(null);
            openQuiz();
          }}
          onClose={() => setCelebrate(null)}
        />
      )}
    </div>
  );
}

/** Final exam tickets: the rules, up front. */
function ExamBanner() {
  return (
    <p
      data-testid="exam-banner"
      className="mt-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-100"
    >
      <b>🎓 Exam mode.</b> No hints, no lesson, no Byte suggestions. Just you, the code and the CI checks.
    </p>
  );
}

/** The ticket's story, folded to about two lines with "Read more" (unfolded on a first visit). */
function Story({ text, defaultOpen = false }: { text: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section aria-labelledby="story-title">
      <h2 id="story-title" className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
        📨 The story
      </h2>
      <div
        id="ticket-story"
        data-testid="ticket-story"
        data-open={open}
        className={open ? "" : "max-h-[3.3rem] overflow-hidden [mask-image:linear-gradient(to_bottom,black_45%,transparent)]"}
      >
        <Markdown text={text} />
      </div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="ticket-story"
        className="mt-1 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
      >
        {open ? "Show less ▲" : "Read more ▼"}
      </button>
    </section>
  );
}

/** "📘 2-min lesson" (or a deep lesson, season.yaml `lesson: long`): the new concept, folded until asked for. */
function Lesson({ concept, newConcept, deep }: { concept: string; newConcept: string; deep: boolean }) {
  // Linked as /ticket/<id>/#lesson (e.g. from a solved Bug Bounty): open it and bring it into view.
  const [open, setOpen] = useState(() => window.location.hash === "#lesson");
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (window.location.hash === "#lesson") ref.current?.scrollIntoView({ block: "start" });
  }, []);
  return (
    <section ref={ref} id="lesson" className="scroll-mt-16 rounded-xl border border-cyan-500/30 bg-cyan-500/5" data-testid="lesson">
      <h2>
        <button
          data-testid="lesson-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="ticket-lesson"
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-cyan-50 hover:bg-cyan-500/10"
        >
          <span aria-hidden>📘</span>
          <span className="flex-1">
            {deep ? `Deep lesson (~${Math.max(3, Math.round(concept.split(/\s+/).length / 150))} min)` : "2-min lesson"}: <b>{conceptLabel(newConcept)}</b>
          </span>
          <span aria-hidden className="text-xs text-cyan-200">{open ? "▲" : "▼"}</span>
        </button>
      </h2>
      {open && (
        <div id="ticket-lesson" className="space-y-3 border-t border-cyan-500/20 px-3 pt-2 pb-3">
          <p className="text-xs text-slate-400">
            {deep
              ? "New concept for this ticket: intuition first, then the maths step by step, a worked example, and what to watch out for. Free to read, no XP cost."
              : "New concept for this ticket. Free to read, no XP cost."}
          </p>
          <Markdown text={concept} />
        </div>
      )}
    </section>
  );
}

/** "Done when" list built from the ticket's test names, ticked from the latest run. */
function AcceptanceChecklist({ checks, result, solved }: { checks: ReturnType<typeof listChecks>; result: RunResult | null; solved: boolean }) {
  if (checks.length === 0) return null;
  const status = new Map(result?.results.map((r) => [`${r.file}:${r.name}`, r.status]) ?? []);
  // If code failed to load, no individual check ran: show them all as failing.
  const loadFailed = result?.results.some((r) => r.name === "(import)") ?? false;
  return (
    <div className="mt-3">
      <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Done when</h3>
      <ul className="mt-1 space-y-1" data-testid="acceptance-checklist">
        {checks.map((c) => {
          const s = solved && !result ? "pass" : (status.get(`${c.file}:${c.name}`) ?? (loadFailed ? "error" : undefined));
          return (
            <li key={`${c.file}:${c.name}`} className="flex gap-2 text-slate-200">
              <span aria-label={s === "pass" ? "passing" : s ? "failing" : "not run yet"}>{s === "pass" ? "✅" : s ? "❌" : "⬜"}</span>
              <span>{c.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
