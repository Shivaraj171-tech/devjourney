"use client";
// The ticket page (design: docs/design/ui-redesign-plan.md).
//
// Desktop (≥1024px): two columns. Left, the brief, headed by the ticket slip:
// goal first ("Your task" + "Done when"), then on a first visit the story and
// (on the tutorial tickets) the lesson, unfolded; Byte's card waits for the
// first run. Incidents put their banner and clock here too. Right, the editor,
// and under it a resizable results pane (a real separator: drag, or arrow keys)
// that starts the Run bar: CI checks, the debugger, the Lab viewer and, on
// incidents, the production logs. It grows after a run so results are never a
// 260 px slit (audit flaw 3).
//
// Phone (<1024px): the same pieces as a 3-step flow (Brief / Code / Checks)
// with Run in a sticky bottom bar. Running switches to Checks.
import { conceptLabel } from "@/lib/content/concepts";
import TaskFormats from "./TaskFormats";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import AskByte from "./AskByte";
import BountyReveal from "./BountyReveal";
import ByteSuggestionCard, { ByteTeaser } from "./ByteSuggestion";
import CodeEditor from "./CodeEditor";
import DebuggerPanel from "./DebuggerPanel";
import { HintsButton } from "./HintPanel";
import IncidentPanel, { IncidentLogs, LogsChip } from "./IncidentPanel";
import LabViewer from "./LabViewer";
import Markdown from "./Markdown";
import Quiz from "./Quiz";
import ReviewPanel from "./ReviewPanel";
import SolvedModal from "./SolvedModal";
import Tabs, { tabPanelProps, type TabItem } from "./Tabs";
import TestResults, { CheckPill } from "./TestResults";
import { listChecks } from "@/lib/content/checks";
import type { Ticket, TicketType } from "@/lib/content/types";
import type { IconName } from "@/lib/icons";
import Icon from "./icons/Icon";
import { sideFloorIcon, TICKET_TYPE } from "./FloorBoard";
import { checkReview, incidentBonus, incidentXp, quizXp, readTicketXp, solveXp, type TicketXp } from "@/lib/game/rules";
import { actions, byteActions, ticketProgress, useProgress, visitActions } from "@/lib/progress/store";
import { PythonRunner, type LoadProgress } from "@/lib/runner/client";
import { loadingView } from "@/lib/runner/loadProgress";
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
  /** The ticket that must be merged first, for the locked screen's wording. */
  prevTicket?: { title: string; number: number; floor: string } | null;
  nextTicket: { id: string; title: string } | null;
};

/** Left-pane tabs. The lesson and the hints are no longer tabs (see the brief and the run bar). */
type Tab = "ticket" | "quiz" | "byte";
/** Phone steps. On review tickets "code" is the pull request. */
type Step = "brief" | "code" | "checks";
/** Desktop results pane tabs. */
type Pane = "checks" | "logs";

/** A recorded step-through of one check, and the code it was recorded on. */
type DebugSession = { trace: TraceResult; files: Record<string, string> };

const TYPE_LABEL: Record<string, string> = {
  bug: "Bug fix",
  feature: "Feature",
  incident: "Incident",
  review: "Code review",
  read: "Code reading",
};
const TYPE_ICON = Object.fromEntries(Object.entries(TICKET_TYPE).map(([k, v]) => [k, v.icon])) as Record<TicketType, IconName>;

const passCount = (r: RunResult) => r.results.filter((x) => x.status === "pass").length;

/** On a phone only the current step shows; on desktop everything does. */
const stepClass = (visible: boolean, display: "flex" | "block" = "flex") =>
  display === "flex" ? (visible ? "flex lg:flex" : "hidden lg:flex") : visible ? "block lg:block" : "hidden lg:block";

/**
 * Results pane share of the editor column (desktop): default (the plan's 45 %), and the size it
 * grows to after a run, in the debugger, and with a Lab drawing. Growth is capped so the editor
 * keeps EDITOR_KEEP px (about 12 lines) on screens at least TALL px high; the learner can still
 * drag (or key) the separator further, down to an editor of EDITOR_FLOOR px.
 */
const SPLIT = { min: 0.2, max: 0.72, start: 0.45, afterRun: 0.52, viz: 0.68, debug: 0.58 };
/** Editor column space kept for the editor (tab bar + 12 lines), the separator and the Run bar. */
const EDITOR_KEEP = 370;
/** The least the editor keeps when the learner drags the results pane up (tab bar + ~6 lines). */
const EDITOR_FLOOR = 230;
const TALL = 720;

/** The results pane's allowed range, for a column `colH` px high (0: not measured yet). */
function splitLimits(colH: number) {
  if (colH <= 0) return { max: SPLIT.max, auto: SPLIT.afterRun };
  const frac = (px: number) => Math.max(SPLIT.min, (colH - px) / colH);
  const max = Math.min(SPLIT.max, frac(EDITOR_FLOOR));
  const tall = typeof window !== "undefined" && window.innerHeight >= TALL;
  return { max, auto: Math.min(max, frac(tall ? EDITOR_KEEP : EDITOR_FLOOR)) };
}

export default function TicketWorkspace({ ticket, prevTicketId, prevTicket = null, nextTicket }: Props) {
  const progress = useProgress();
  const tp = ticketProgress(progress, ticket.id);
  const isRead = ticket.type === "read";
  const review = ticket.review;
  const noRunner = isRead || !!review; // read and review tickets have no tests to run
  // Final exam (season.yaml `final: true`): no hints, no lesson, no Byte, no concept chip. CI checks stay.
  const exam = ticket.final === true;
  // Bug Bounty side quest: a mystery bug, so no concept chip and no lesson (revealed once solved).
  const bounty = ticket.bounty;
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
  const [loadProgress, setLoadProgress] = useState<LoadProgress | null>(null);
  useEffect(() => {
    // Don't download Python for read/review tickets, locked tickets, or the static HTML.
    if (noRunner || locked || !isClient) return;
    const runner = new PythonRunner();
    runner.onProgress = setLoadProgress;
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

  // ----- desktop results pane: resizable split, and which tab shows -----
  const [split, setSplit] = useState(SPLIT.start);
  // The editor column's height, so automatic growth never squeezes the editor below ~12 lines.
  const [colH, setColH] = useState(0);
  const colHRef = useRef(0);
  useEffect(() => {
    colHRef.current = colH;
  }, [colH]);
  const grow = useCallback((to: number) => setSplit((s) => Math.max(s, Math.min(to, splitLimits(colHRef.current).auto))), []);
  const limits = splitLimits(colH);
  const paneSplit = Math.min(split, limits.max);
  const [pane, setPane] = useState<Pane>(ticket.incident ? "logs" : "checks");

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
    setPane("checks");
    grow(SPLIT.afterRun);
    const files = { ...ticket.starter, ...tp.code };
    const res = await runner.run(files, ticket.tests);
    codeRunActions.logRun(ticket.id, res, files, listChecks(ticket.tests).length); // coding profile: no code stored
    if (!res.error) setPassHistory((h) => [...h, passCount(res)]);
    setResult(res);
    setRunning(false);
    if (res.viz) grow(SPLIT.viz);
    // Keep focus somewhere useful: if it was lost (on something the run replaced), move it to
    // the run summary; otherwise leave it where the learner is (Run tests, or the editor).
    requestAnimationFrame(() => {
      if (document.activeElement && document.activeElement !== document.body) return;
      document.querySelector<HTMLElement>('[data-testid="run-summary"]')?.focus();
    });
    if (res.error) {
      restartPython(runner);
      return;
    }
    const wasSolved = tp.solved;
    const runsAfter = tp.runs + 1;
    actions.recordRun(ticket.id, res.passed, (runs, hints) => passXp(runs, hints).total);
    if (res.passed && !wasSolved) setCelebrate(passXp(runsAfter, tp.hintsUsed));
  }, [running, tracing, ticket, tp, passXp, restartPython, setCelebrate, grow]);

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
      setPane("checks");
      grow(SPLIT.debug);
      setStep("code"); // phone: the highlighted line is in the editor
      goToStep(out.trace, 0);
    },
    [running, tracing, ticket, tp.code, goToStep, restartPython, grow],
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
    return <div className="p-8 text-center text-slate-300">Opening ticket…</div>;
  }

  if (locked) {
    return <LockedTicket ticket={ticket} prevTicketId={prevTicketId!} prevTicket={prevTicket} />;
  }

  // ----- left-pane tabs: only what's useful right now -----
  const tabs: TabItem<Tab>[] = [{ id: "ticket", label: "Ticket" }];
  // The quiz is part of the "after merge" flow (read tickets: it *is* the task).
  if (hasQuiz && quizUnlocked) tabs.push({ id: "quiz", label: tp.quizDone ? "Quiz, done" : "Quiz" });
  // On review tickets the prompt card could hint at the bug, so it opens after the review.
  if (ticket.byte?.prompt && !exam && !(review && !tp.solved)) tabs.push({ id: "byte", label: "Ask Byte" });
  const activeTab: Tab = tabs.some((t) => t.id === tab) ? tab : "ticket";
  const openQuiz = () => {
    setTab("quiz");
    setStep("brief");
  };

  // ----- phone steps -----
  const steps: TabItem<Step>[] = [{ id: "brief", label: "1 Brief" }];
  if (review) steps.push({ id: "code", label: "2 Pull request" });
  else {
    steps.push({ id: "code", label: "2 Code" });
    if (!isRead) {
      const passed = result && !result.error ? (result.passed ? checks.length : passCount(result)) : null;
      steps.push({ id: "checks", label: <>3 Checks{passed !== null && <span className="ml-1 tabular-nums opacity-80">{passed}/{checks.length}</span>}</> });
    }
  }
  const phoneStep: Step = steps.some((s) => s.id === step) ? step : "brief";
  const showEditor = editorLoaded || isDesktop || phoneStep === "code";
  if (showEditor && !editorLoaded) setEditorLoaded(true); // once loaded, keep it (undo history)
  const stepPanel = (id: Step) => (isDesktop ? {} : tabPanelProps("step", id));

  const hints = (placement: "up" | "down") => exam ? null : (
    <HintsButton placement={placement} hints={ticket.hints} revealed={tp.hintsUsed} solved={tp.solved} onReveal={() => actions.revealHint(ticket.id)} />
  );
  // Desktop: the banner and clock lead the brief; the logs are a tab of the results pane.
  const incident = ticket.incident && (
    <IncidentPanel ticketId={ticket.id} incident={ticket.incident} tp={tp} logsOpenAtStart={isDesktop} withLogs={!isDesktop} />
  );
  // Ticket 1 and 2 (tutorial): the lesson is open on the first visit, so the order is
  // the onboarding's promise, read, learn, fix (audit flaw 5).
  const lessonOpenAtStart = firstVisit === true && ticket.tutorial === true;

  // ----- "Your task": the first thing in the brief -----
  let task: ReactNode;
  if (isRead) {
    task = (
      <>
        <p className="mt-1 text-slate-200">Read the code, then answer the questions. No code changes needed.</p>
        {hasQuiz && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={openQuiz}
              className={`flex-1 rounded-lg py-2 ${tp.quizDone && nextTicket ? "border border-slate-600 text-slate-200 hover:border-slate-400 hover:text-white" : "btn-signal"}`}
            >
              {tp.quizDone ? "See your answers" : "Start the questions"}
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
        <p className="mt-1 text-slate-200">
          Review {review.author}&apos;s pull request. Tap every line that has a real problem, then press <b className="text-ink">Submit review</b>. Each line
          you flag that is actually fine costs 10 XP.
        </p>
        <p className="mt-2 text-sm font-semibold text-ink" data-testid="review-progress">
          <Icon name="flag" className="mr-1.5" />
          {found} of {total} problem{total === 1 ? "" : "s"} found
        </p>
      </>
    );
  } else {
    task = (
      <>
        <p className="mt-1 text-slate-200">
          Edit{" "}
          {editableFiles.map((p, i) => (
            <span key={p}>
              {i > 0 && ", "}
              <code className="rounded bg-slate-800 px-1 text-[0.92em] text-ink">{p}</code>
            </span>
          ))}{" "}
          until every check passes.
        </p>
        <AcceptanceChecklist checks={checks} result={result} solved={tp.solved} />
      </>
    );
  }

  const loading = loadingView(loadProgress);
  // While Python loads, the button itself names the stage (plan: "the Run button shows the real stage").
  const runLabel = pythonState === "loading" ? runStageLabel(loadProgress) : pythonState === "failed" ? "Python failed to load" : running ? "Running…" : "Run tests";
  const runOff = running || pythonState !== "ready";
  // Said politely by screen readers: the run started, and how it ended (the results pane may be off screen).
  const runNews = running
    ? "Running the checks…"
    : !result
      ? ""
      : result.error
        ? `The run stopped: ${result.error}`
        : result.passed
          ? "All checks passed."
          : `${passCount(result)} of ${checks.length} checks passing.`;

  // ----- the results pane's content (desktop pane, or the phone's Checks step) -----
  const checksContent = (
    <>
      {traceError && (
        <div data-testid="trace-error" className="mb-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          <Icon name="warning" className="mr-1.5" />
          Couldn&apos;t step through that check: {traceError}
        </div>
      )}
      {pythonState === "loading" && !result && <PythonLoading view={loading} />}
      <AdaptiveHelpCard ticket={ticket} tp={tp} result={result} onStepThrough={pythonState === "ready" ? stepThrough : undefined} onShowBrief={() => setStep("brief")} />
      <TestResults result={result} running={running} total={checks.length} onStepThrough={pythonState === "ready" ? stepThrough : undefined} tracing={tracing} />
      {/* Robotics Lab: what the run drew (`from lab import viz`), under the checks. A new run replays it. */}
      {!running && result?.viz && <div className="mt-3"><LabViewer key={passHistory.length} items={result.viz} /></div>}
    </>
  );

  const paneTabs: TabItem<Pane>[] = [
    {
      id: "checks",
      label: (
        <>
          {debug ? "Step through" : "Checks"}
          {result && !result.error && !debug && (
            <span className="ml-1.5 tabular-nums text-slate-300">
              {result.passed ? checks.length : passCount(result)}/{checks.length}
            </span>
          )}
        </>
      ),
    },
  ];
  if (ticket.incident) paneTabs.push({ id: "logs", label: "Production logs" });

  return (
    <div
      className={`ticket-page mx-auto grid max-w-[1600px] grid-cols-[minmax(0,1fr)] content-start gap-3 p-3 lg:h-[calc(100vh-3.5rem)] lg:grid-cols-[380px_minmax(0,1fr)] lg:content-stretch xl:grid-cols-[420px_minmax(0,1fr)] ${
        noRunner ? "" : "pb-24 lg:pb-3"
      }`}
    >
      {/* ---------- phone: Brief / Code / Checks ---------- */}
      <div className="sticky top-14 z-20 -mx-3 -mt-3 border-b border-rule bg-page/95 px-3 py-2 backdrop-blur lg:hidden">
        {/* Phone: the slip (and its h1) is on the Brief step, so the other steps get their own. */}
        {!isDesktop && phoneStep !== "brief" && (
          <h1 className="sr-only" data-testid="step-heading">
            Ticket #{ticket.number}, {ticket.title}: {phoneStep === "code" ? (review ? "the pull request" : "the code") : "the checks"}
          </h1>
        )}
        <Tabs
          tabs={steps}
          active={phoneStep}
          onChange={setStep}
          idPrefix="step"
          label="Ticket steps"
          className="flex gap-1 rounded-xl bg-panel p-1"
          tabClassName={(on) =>
            `flex-1 rounded-lg px-2 py-2 text-sm font-semibold whitespace-nowrap ${on ? "bg-ink text-page shadow" : "text-slate-300 hover:text-ink"}`
          }
        />
      </div>

      {/* ---------- left: the brief ---------- */}
      <section
        {...stepPanel("brief")}
        aria-label="Ticket brief"
        className={`${stepClass(phoneStep === "brief")} min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-rule bg-panel`}
      >
        <TicketSlip ticket={ticket} exam={exam} solved={tp.solved} review={!!review} isRead={isRead} />
        {(exam || bounty) && (
          <div className="px-4">
            {exam && <ExamBanner />}
            {bounty && <BountyReveal bounty={bounty} solved={tp.solved} />}
          </div>
        )}
        {tabs.length > 1 && (
          <Tabs
            tabs={tabs}
            active={activeTab}
            onChange={setTab}
            idPrefix="pane"
            label="Ticket sections"
            className="mt-2 flex border-b border-rule text-sm"
            tabClassName={(on) =>
              `flex-1 border-b-2 px-3 py-2.5 whitespace-nowrap ${on ? "border-signal font-semibold text-ink" : "border-transparent text-slate-300 hover:text-ink"}`
            }
          />
        )}
        <div {...(tabs.length > 1 ? tabPanelProps("pane", activeTab) : {})} className="min-h-0 flex-1 overflow-y-auto p-4 text-slate-200">
          {activeTab === "ticket" && (
            <div className="space-y-5">
              {/* The incident banner and its clock lead the brief, so the urgency lands first. */}
              {incident}

              {/* 1. The goal, always first. */}
              <section data-testid="ticket-goal" aria-labelledby="goal-title" className="text-[15px]">
                <h2 id="goal-title" className="text-lg font-bold text-ink">
                  Your task
                </h2>
                {task}
                {tp.solved && !isRead && hasQuiz && !tp.quizDone && (
                  <button onClick={openQuiz} className="mt-3 w-full rounded-lg border border-byte/60 py-2 font-semibold text-ink hover:bg-byte/15">
                    Lock it in: take the 1-minute quiz
                  </button>
                )}
                {!review && !isDesktop && (
                  <button
                    data-testid="goto-code"
                    onClick={() => setStep("code")}
                    className="mt-3 w-full rounded-lg border border-slate-600 py-2.5 font-semibold text-ink hover:bg-slate-800"
                  >
                    Open the code
                  </button>
                )}
                {review && !isDesktop && (
                  <button data-testid="goto-code" onClick={() => setStep("code")} className="btn-signal mt-3 w-full rounded-lg py-2.5">
                    Open the pull request
                  </button>
                )}
              </section>

              {/* First visit: the story, unfolded, before anything else is asked of the learner. */}
              {firstVisit && <Story text={ticket.story} defaultOpen />}
              {/* Tutorial tickets, first visit: the lesson comes next, open. */}
              {lessonOpenAtStart && ticket.concept && !exam && !bounty && (
                <Lesson concept={ticket.concept} newConcept={ticket.newConcept} deep={ticket.deepLesson === true} defaultOpen />
              )}

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
                <ByteTeaser
                  autocomplete={ticket.seasonId === "s01"}
                  onOpen={() => {
                    setBytePeeked(true);
                    // The teaser (and its button) goes away: move focus to the card it opened.
                    requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-testid="byte-suggestion"]')?.focus());
                  }}
                />
              ))}

              {/* 3. Practice formats from formats.yaml: predict the output, break Byte's
                  code, put the lines in order. Renders nothing for tickets without them. */}
              {!exam && <TaskFormats ticket={ticket} tp={tp} getRunner={() => runnerRef.current} />}

              {/* 4. The story, folded to two lines (after the first visit). */}
              {!firstVisit && <Story text={ticket.story} />}

              {/* 5. The lesson, folded (unless it opened above). */}
              {!lessonOpenAtStart && ticket.concept && !exam && !bounty && <Lesson concept={ticket.concept} newConcept={ticket.newConcept} deep={ticket.deepLesson === true} />}
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
          <Link href={`/ticket/${nextTicket.id}`} className="btn-signal m-3 rounded-lg px-4 py-2.5 text-center">
            Next ticket: {nextTicket.title}
          </Link>
        )}
      </section>

      {/* ---------- right: pull request (review tickets) or IDE + checks ---------- */}
      {review ? (
        <div {...stepPanel("code")} className={`${stepClass(phoneStep === "code")} min-h-0 min-w-0 flex-col`}>
          <ReviewPanel ticket={{ ...ticket, review }} tp={tp} onSolved={setCelebrate} actions={hints("up")} />
        </div>
      ) : (
        <SplitColumn split={isDesktop && !isRead ? paneSplit : null} max={limits.max} onSplit={setSplit} onHeight={setColH}>
          {/* Phone: the logs are in the Brief step; a chip keeps them one tap away while coding. */}
          {!isDesktop && ticket.incident && phoneStep === "code" && <LogsChip logs={ticket.incident.logs} />}
          <div
            {...stepPanel("code")}
            className={`${stepClass(phoneStep === "code")} h-[calc(100dvh-13rem)] min-h-[320px] flex-col overflow-hidden rounded-xl border border-rule bg-editor lg:h-auto lg:min-h-[140px] lg:flex-1`}
            // Phone + debugger: just tall enough for the code (tab bar ~37px), so the debugger isn't a screen away.
            style={!isDesktop && debug && codeHeight ? { height: `min(calc(100dvh - 13rem), ${Math.max(160, codeHeight + 38)}px)`, minHeight: 0 } : undefined}
            data-testid="code-panel"
          >
            <div className="flex items-center border-b border-rule bg-panel px-2">
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
                      className={`min-h-9 shrink-0 border-b-2 px-3 py-2 font-mono text-xs ${
                        activeFile === path ? "border-signal text-ink" : `border-transparent ${canEdit ? "text-ink" : "text-slate-300"} hover:text-ink`
                      }`}
                      title={canEdit ? "You can edit this file" : "Read-only"}
                    >
                      <Icon name={canEdit ? "pencil" : "lock"} className="mr-1.5" />
                      {path}
                    </button>
                  );
                })}
                {!isRead && editableFiles.length > 0 && otherFiles.length > 0 && (
                  <button
                    data-testid="toggle-other-files"
                    onClick={() => setShowOtherFiles((v) => !v)}
                    aria-expanded={showOtherFiles}
                    className="min-h-8 shrink-0 rounded-md px-2 py-1 text-xs whitespace-nowrap text-slate-300 hover:bg-slate-800 hover:text-ink"
                  >
                    {showOtherFiles ? (
                      "Hide read-only files"
                    ) : (
                      <>
                        <Icon name="lock" className="mr-1" />+{otherFiles.length} read-only file{otherFiles.length === 1 ? "" : "s"}
                      </>
                    )}
                  </button>
                )}
              </div>
              {!isRead && editable.has(activeFile) && (
                <button
                  onClick={() => {
                    if (confirm("Reset your changes to this ticket's starting code?")) actions.resetCode(ticket.id);
                  }}
                  className="ml-1 min-h-8 shrink-0 rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-ink"
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

          {/* Run, progress, hints. Phone: a sticky bottom bar. Desktop: the top of the results pane. */}
          {!isRead && (
            <div
              data-testid="run-bar"
              className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-rule bg-page/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:z-auto lg:shrink-0 lg:rounded-t-xl lg:border lg:border-b-0 lg:bg-panel lg:py-2 lg:backdrop-blur-none"
            >
              {/* aria-disabled, not disabled: it stays in the tab order (and keeps focus during a run). */}
              <button
                type="button"
                data-testid="run-tests"
                onClick={() => !runOff && runTests()}
                aria-disabled={runOff || undefined}
                aria-describedby={pythonState === "loading" ? "python-loading-why" : undefined}
                data-stage={pythonState === "loading" ? loading.step : undefined}
                className="btn-signal shrink-0 rounded-lg px-4 py-2 text-sm whitespace-nowrap"
              >
                {runLabel === "Run tests" && <Icon name="play" className="mr-1.5 h-4 w-4" />}
                {runLabel}
              </button>
              {pythonState === "loading" && (
                <span id="python-loading-why" className="sr-only">
                  Python is still loading: {loading.label}. Run tests turns on when it is ready.
                </span>
              )}
              <p className="sr-only" role="status" aria-live="polite" data-testid="run-announcer">
                {runNews}
              </p>
              {pythonState === "loading" ? (
                <LoadingBar view={loading} />
              ) : (
                <CheckPill total={checks.length} result={result} previousPassed={previousPassed} />
              )}
              <div className="ml-auto">{hints("up")}</div>
            </div>
          )}

          {!isRead && (
            <div
              {...stepPanel("checks")}
              data-testid="results-pane"
              className={`${stepClass(phoneStep === "checks" || (!!debug && phoneStep === "code"), "flex")} min-h-0 flex-col overflow-hidden rounded-xl border border-rule bg-panel lg:flex-none lg:rounded-t-none ${
                debug ? "max-lg:border-violet-500/40" : ""
              }`}
              // The editor keeps ~12 lines after a run (EDITOR_KEEP), and never less than EDITOR_FLOOR.
              style={isDesktop ? { height: `${paneSplit * 100}%`, maxHeight: `calc(100% - ${EDITOR_FLOOR}px)` } : undefined}
            >
              {isDesktop && (
                <div className="flex shrink-0 items-center gap-2 border-b border-rule px-3">
                  {paneTabs.length > 1 ? (
                    <Tabs
                      tabs={paneTabs}
                      active={pane}
                      onChange={setPane}
                      idPrefix="results"
                      label="Results"
                      className="flex min-w-0 gap-1 text-sm"
                      tabClassName={(on) => `-mb-px border-b-2 px-2 py-2 whitespace-nowrap ${on ? "border-signal font-semibold text-ink" : "border-transparent text-slate-300 hover:text-ink"}`}
                    />
                  ) : (
                    <h2 className="py-2 text-sm font-semibold text-ink">{paneTabs[0].label}</h2>
                  )}
                  <button
                    type="button"
                    data-testid="results-size"
                    onClick={() => setSplit(paneSplit >= limits.max - 0.01 ? SPLIT.start : limits.max)}
                    className="ml-auto min-h-8 rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-ink"
                  >
                    {paneSplit >= limits.max - 0.01 ? "Smaller results" : "Larger results"}
                  </button>
                </div>
              )}
              <div
                {...(isDesktop && paneTabs.length > 1 ? tabPanelProps("results", pane) : {})}
                className="min-h-0 flex-1 overflow-y-auto p-4"
                data-testid="results-scroll"
              >
                {!isDesktop && !debug && <h2 className="mb-2 text-sm font-semibold text-ink">Checks</h2>}
                {pane === "logs" && isDesktop && ticket.incident ? (
                  <IncidentLogs logs={ticket.incident.logs} className="-mx-4 -mt-2 h-[calc(100%+1.5rem)] min-h-[150px]" />
                ) : debug ? (
                  <DebuggerPanel
                    trace={debug.trace}
                    position={debugPos}
                    onPosition={(pos) => goToStep(debug.trace, pos)}
                    onClose={() => setDebug(null)}
                    stale={debugStale}
                    files={debug.files}
                  />
                ) : (
                  checksContent
                )}
              </div>
            </div>
          )}
        </SplitColumn>
      )}

      {celebrate && (
        <SolvedModal
          xp={celebrate}
          isRead={isRead}
          variant={ticket.type}
          ticket={{ number: ticket.number, title: ticket.title }}
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

/**
 * The editor column. On desktop (`split` set) a separator above the Run bar resizes the
 * results pane: drag it, or focus it and use the arrow keys (Home: smallest results, End: largest).
 */
function SplitColumn({
  split,
  max,
  onSplit,
  onHeight,
  children,
}: {
  split: number | null;
  max: number;
  onSplit: (f: number) => void;
  onHeight: (px: number) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const dragging = useRef(false);
  const clamp = (f: number) => Math.min(max, Math.max(SPLIT.min, f));
  const desktop = split !== null;
  useEffect(() => {
    const el = ref.current;
    if (!el || !desktop) return;
    const measure = () => onHeight(Math.round(el.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [desktop, onHeight]);
  const fromPointer = (clientY: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    // The pane's top edge follows the pointer (the Run bar sits between it and the editor).
    onSplit(clamp((box.bottom - clientY - 52) / box.height));
  };
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (split === null) return;
    const step = e.shiftKey ? 0.1 : 0.05;
    // WAI-ARIA window splitter: the value is the results pane's size, so Home gives it its
    // smallest size and End its largest.
    const next = e.key === "ArrowUp" ? split + step : e.key === "ArrowDown" ? split - step : e.key === "Home" ? SPLIT.min : e.key === "End" ? max : null;
    if (next === null) return;
    e.preventDefault();
    onSplit(clamp(next));
  };
  const items = Array.isArray(children) ? children : [children];
  return (
    <section ref={ref} aria-label="Code and checks" className="flex min-h-0 min-w-0 flex-col gap-3 lg:gap-0">
      {split === null
        ? children
        : items.map((child, i) => (
            // The separator goes right before the Run bar (the third child: logs chip, editor, run bar, pane).
            <Fragment key={i}>
              {i === 2 && (
                <div
                  role="separator"
                  aria-orientation="horizontal"
                  aria-label="Resize the results pane"
                  aria-valuemin={Math.round(SPLIT.min * 100)}
                  aria-valuemax={Math.round(max * 100)}
                  aria-valuenow={Math.round(split * 100)}
                  aria-valuetext={`Results take ${Math.round(split * 100)}% of the height`}
                  tabIndex={0}
                  data-testid="results-resizer"
                  onKeyDown={onKeyDown}
                  onPointerDown={(e: ReactPointerEvent) => {
                    dragging.current = true;
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e: ReactPointerEvent) => dragging.current && fromPointer(e.clientY)}
                  onPointerUp={() => (dragging.current = false)}
                  className="group flex h-3 shrink-0 cursor-row-resize touch-none items-center justify-center"
                  title="Drag to resize (or focus and use the arrow keys, Home and End)"
                >
                  <span aria-hidden className="h-1 w-12 rounded-full bg-slate-700 group-hover:bg-signal group-focus-visible:bg-signal" />
                </div>
              )}
              {child}
            </Fragment>
          ))}
    </section>
  );
}

/** The slip at the top of the brief: the order number, the title, what kind of ticket. */
function TicketSlip({ ticket, exam, solved, review, isRead }: { ticket: Ticket; exam: boolean; solved: boolean; review: boolean; isRead: boolean }) {
  const sideFloor = ticket.sideFloor;
  return (
    <header className="slip mx-3 mt-3 rounded-sm px-4" data-testid="ticket-slip">
      <div className="flex items-start gap-3">
        <span className="slip-number text-[2.6rem]" aria-hidden>
          #{ticket.number}
        </span>
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-lg leading-snug font-bold text-paper-ink">
            <span className="sr-only">#{ticket.number} </span>
            {ticket.title}
          </h1>
        </div>
      </div>
      <div className="slip-rule mt-3" />
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-paper-muted" aria-label="About this ticket">
        <li>
          <Icon name={TYPE_ICON[ticket.type]} className="mr-1" />
          {TYPE_LABEL[ticket.type]}
        </li>
        <li>About {ticket.estimatedMinutes} min</li>
        {!exam && !ticket.bounty && <li className="font-semibold text-paper-ink">New: {conceptLabel(ticket.newConcept)}</li>}
        {ticket.bounty && (
          <li className="font-semibold text-paper-ink">
            <Icon name="posted" className="mr-1" />
            Mystery bug
          </li>
        )}
        {sideFloor && (
          <li data-testid="side-floor-chip">
            <Icon name={sideFloorIcon(ticket.seasonId)} className="mr-1" />
            {sideFloor.title}
          </li>
        )}
        {solved && (
          <li className="font-semibold text-[#137a43]" data-testid="slip-state">
            <Icon name="spike" className="mr-1" />
            {review ? "Reviewed" : isRead ? "Done" : ticket.type === "incident" ? "Resolved" : "Merged"}
          </li>
        )}
      </ul>
    </header>
  );
}

/** The Run button's text while Python loads: the worker's real stage, short enough for a phone. */
function runStageLabel(p: LoadProgress | null): string {
  if (!p || p.stage === "waiting") return "Getting Python ready…";
  if (p.stage === "download") {
    const total = Math.max(1, p.filesTotal);
    return p.filesDone >= total ? "Starting Python…" : `Downloading Python ${Math.min(p.filesDone, total)}/${total}…`;
  }
  return "Loading the checks…";
}

/** Python is loading: the real stage, a bar, and why it takes a moment. */
function PythonLoading({ view }: { view: ReturnType<typeof loadingView> }) {
  return (
    <div id="python-loading" data-testid="python-loading" className="mb-3 rounded-lg border border-rule bg-slate-950/50 p-3 text-sm" role="status" aria-live="polite">
      <p className="font-semibold text-ink">{view.label}</p>
      <p className="mt-0.5 text-slate-300">{view.detail} You can read the brief meanwhile.</p>
    </div>
  );
}

function LoadingBar({ view }: { view: ReturnType<typeof loadingView> }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2" data-testid="python-progress">
      <div
        className="relative h-2 w-24 shrink-0 overflow-hidden rounded-full bg-slate-800 sm:w-32"
        role="progressbar"
        aria-label="Loading Python"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={view.percent}
        aria-valuetext={view.label}
      >
        <div className="h-full rounded-full bg-signal transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${view.percent}%` }} />
        <div className="load-shimmer absolute inset-0" />
      </div>
      <span className="truncate text-xs text-slate-300">
        Step {view.step} of {view.steps}
        <span className="sr-only">: {view.label}</span>
      </span>
    </div>
  );
}

/** A ticket that isn't open yet: say what opens it, in this floor's words. */
function LockedTicket({ ticket, prevTicketId, prevTicket }: { ticket: Ticket; prevTicketId: string; prevTicket: { title: string; number: number; floor: string } | null }) {
  const bounty = ticket.bounty;
  const sideFloor = ticket.sideFloor;
  const named = prevTicket ? `ticket #${prevTicket.number}, “${prevTicket.title}”` : "the ticket before this one";
  const where = prevTicket ? ` (${prevTicket.floor})` : "";
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      {/* The ticket itself, still on the backlog rail: its number, its name, a padlock. */}
      <div className="slip-lift max-w-xs -rotate-1">
        <div className="slip rounded-sm px-5" aria-hidden>
          <div className="flex items-start gap-3 text-paper-muted">
            <span className="slip-number text-[2.5rem]">#{ticket.number}</span>
            <span className="min-w-0 flex-1 pt-1 font-display leading-snug font-bold">{ticket.title}</span>
            <Icon name="lock" className="mt-1 h-6 w-6" />
          </div>
        </div>
      </div>
      <h1 className="mt-6 text-2xl font-bold text-ink">This ticket is still in the backlog</h1>
      <p className="mt-2 text-slate-200" data-testid="locked-reason">
        {bounty
          ? `This bounty opens once you've solved ${named}${where}: it teaches what you need for it.`
          : sideFloor && ticket.number === 1
            ? `The ${sideFloor.title} opens once you've merged ${named}${where}.`
            : `Merge ${named}${where} first. Each ticket builds on the one before it.`}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/ticket/${prevTicketId}`} className="btn-signal rounded-lg px-4 py-2.5">
          Go to previous ticket
        </Link>
        <Link href="/" className="rounded-lg border border-slate-600 px-4 py-2.5 text-slate-200 hover:bg-slate-800">
          Back to the office
        </Link>
      </div>
    </div>
  );
}

/** Final exam tickets: the rules, up front. */
function ExamBanner() {
  return (
    <p data-testid="exam-banner" className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
      <Icon name="stamp" className="mr-1.5" />
      <b>Exam mode.</b> No hints, no lesson, no Byte suggestions. Just you, the code and the CI checks.
    </p>
  );
}

/** The ticket's story, folded to about two lines with "Read more" (unfolded on a first visit). */
function Story({ text, defaultOpen = false }: { text: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section aria-labelledby="story-title">
      <h2 id="story-title" className="mb-1 text-base font-bold text-ink">
        The story
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
        className="mt-1 min-h-8 text-sm font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4 hover:decoration-4"
      >
        {open ? "Show less" : "Read more"}
      </button>
    </section>
  );
}

/** "2-min lesson" (or a deep lesson, season.yaml `lesson: long`): the new concept, folded until asked for. */
function Lesson({ concept, newConcept, deep, defaultOpen = false }: { concept: string; newConcept: string; deep: boolean; defaultOpen?: boolean }) {
  // Linked as /ticket/<id>/#lesson (e.g. from a solved Bug Bounty): open it and bring it into view.
  const [open, setOpen] = useState(() => defaultOpen || window.location.hash === "#lesson");
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (window.location.hash === "#lesson") ref.current?.scrollIntoView({ block: "start" });
  }, []);
  return (
    <section ref={ref} id="lesson" className="scroll-mt-16 rounded-lg border border-rule bg-slate-950/40" data-testid="lesson">
      <h2>
        <button
          data-testid="lesson-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="ticket-lesson"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-ink hover:bg-slate-800/60"
        >
          <Icon name="book" className="h-5 w-5 text-slate-300" />
          <span className="flex-1">
            {deep ? `Deep lesson (~${Math.max(3, Math.round(concept.split(/\s+/).length / 150))} min)` : "2-min lesson"}: <b>{conceptLabel(newConcept)}</b>
          </span>
          <span aria-hidden className="text-xs text-slate-300">{open ? "▲" : "▼"}</span>
        </button>
      </h2>
      {open && (
        <div id="ticket-lesson" className="space-y-3 border-t border-rule px-3 pt-2 pb-3">
          <p className="text-xs text-slate-300">
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
      <h3 className="text-sm font-semibold text-ink">Done when</h3>
      <ul className="mt-1 space-y-1" data-testid="acceptance-checklist">
        {checks.map((c) => {
          const s = solved && !result ? "pass" : (status.get(`${c.file}:${c.name}`) ?? (loadFailed ? "error" : undefined));
          return (
            <li key={`${c.file}:${c.name}`} className="flex gap-2 text-slate-200">
              <span role="img" data-check={s === "pass" ? "pass" : s ? "fail" : "pending"} aria-label={s === "pass" ? "passing" : s ? "failing" : "not run yet"} className={`mt-0.5 ${s === "pass" ? "text-pass" : s ? "text-fail" : "text-slate-300"}`}>
                <Icon name={s === "pass" ? "check" : s ? "cross" : "pending"} />
              </span>
              <span>{c.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
