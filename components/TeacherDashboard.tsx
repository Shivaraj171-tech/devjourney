"use client";
// /teacher/: a no-account class overview. The teacher opens a class code and
// pastes the report codes students made on their settings page. Codes are
// decoded in this browser (lib/teacher/*) and kept only in this browser's
// localStorage (devjourney:teacher:v1). Nothing is sent anywhere.
import Link from "next/link";
import { useId, useMemo, useRef, useState } from "react";
import { downloadText } from "@/lib/progress/backupMeta";
import { dayKey } from "@/lib/game/rules";
import {
  classCsv,
  classSummary,
  csvFileName,
  mergeStudents,
  parseReportCodes,
  parseTeacherStore,
  sortStudents,
  studentsFromCodes,
  type Problem,
  type SortKey,
  type Student,
  type TeacherStore,
} from "@/lib/teacher/classroom";
import { catchRate, normalizeClassCode, skillsGain, ticketsMerged, type ClassReport } from "@/lib/teacher/report";
import { useIsClient } from "@/lib/useIsClient";
import Icon from "@/components/icons/Icon";

export type FloorInfo = { id: string; short: string; title: string };

const STORE_KEY = "devjourney:teacher:v1";

const CARD = "rounded-2xl border border-slate-800 bg-slate-900/60 p-5";
const INPUT =
  "mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40";
const BTN_PRIMARY =
  "rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50";
const BTN_SECONDARY =
  "rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50";

function loadStore(): TeacherStore {
  try {
    return parseTeacherStore(window.localStorage.getItem(STORE_KEY));
  } catch {
    return { classes: {} };
  }
}

function saveStore(store: TeacherStore): boolean {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

const pct = (x: number | null) => (x === null ? "–" : `${Math.round(x * 100)}%`);
const num = (x: number | null, digits = 1) => (x === null ? "–" : Number.isInteger(x) ? String(x) : x.toFixed(digits));
const signed = (x: number | null) => (x === null ? "–" : x > 0 ? `+${x}` : String(x));

export default function TeacherDashboard({ floors }: { floors: FloorInfo[] }) {
  const isClient = useIsClient();
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header>
        <p className="text-sm text-slate-300">DevJourney, for teachers</p>
        <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Teacher view</h1>
        <p className="mt-2 max-w-3xl text-slate-300">
          See how your class is doing without accounts. Give students a class code; each one opens{" "}
          <Link href="/settings" className="font-semibold text-cyan-300 underline hover:text-cyan-200">Settings</Link> (the wrench in the top bar),
          types it in, and sends you their <b className="text-white">class report code</b>. Paste the codes here.
        </p>
      </header>
      <PrivacyNote />
      {isClient ? <Classroom floors={floors} /> : <p className="text-slate-400">Opening the teacher view…</p>}
    </div>
  );
}

function PrivacyNote() {
  return (
    <aside data-testid="privacy-note" aria-label="Privacy" className="rounded-2xl border border-emerald-400/30 bg-emerald-950/20 p-4 text-sm text-slate-200">
      <p className="font-bold text-emerald-100">Nothing leaves this device.</p>
      <p className="mt-1">
        Report codes are decoded right here in your browser and saved only in this browser&apos;s local storage. There is no server,
        no account and no tracking: DevJourney never sees your class. A code holds a student&apos;s name, the class code, tickets merged
        per floor, XP, Byte (human-in-the-loop) stats, skills check scores and the day they last played. No code or answers. Clearing
        this browser&apos;s site data removes it; download a CSV to keep a copy.
      </p>
    </aside>
  );
}

function Classroom({ floors }: { floors: FloorInfo[] }) {
  const [store, setStore] = useState<TeacherStore>(loadStore);
  const [classCode, setClassCode] = useState<string | null>(store.lastClass ?? null);
  const [storageOk, setStorageOk] = useState(true);

  const commit = (next: TeacherStore) => {
    setStore(next);
    setStorageOk(saveStore(next));
  };

  const open = (code: string) => {
    setClassCode(code);
    commit({ ...store, lastClass: code, classes: { ...store.classes, [code]: store.classes[code] ?? [] } });
  };

  return (
    <>
      <ClassPicker store={store} current={classCode} onOpen={open} />
      {!storageOk && (
        <p role="alert" className="rounded-lg border border-amber-400/40 bg-amber-950/40 p-3 text-sm text-amber-100">
          <Icon name="warning" className="mr-1" />
          This browser won&apos;t let the page save (private window or blocked site data). The class works until you close the tab: download the CSV to keep it.
        </p>
      )}
      {classCode && (
        <ClassView
          key={classCode}
          classCode={classCode}
          codes={store.classes[classCode] ?? []}
          floors={floors}
          onCodes={(codes) => commit({ ...store, lastClass: classCode, classes: { ...store.classes, [classCode]: codes } })}
          onDelete={() => {
            const classes = { ...store.classes };
            delete classes[classCode];
            commit({ classes });
            setClassCode(null);
          }}
        />
      )}
    </>
  );
}

function ClassPicker({ store, current, onOpen }: { store: TeacherStore; current: string | null; onOpen: (code: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();
  const saved = Object.keys(store.classes).sort();
  return (
    <section aria-labelledby="class-title" className={CARD}>
      <h2 id="class-title" className="text-lg font-bold text-white">Your class</h2>
      <form
        className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const code = normalizeClassCode(value);
          if (!code) {
            setError("A class code is 2-16 letters, numbers or dashes, e.g. CS1-BLUE.");
            return;
          }
          setError(null);
          setValue("");
          onOpen(code);
        }}
      >
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="text-sm font-semibold text-slate-200">Class code (the one you gave your students)</label>
          <input
            id={inputId}
            data-testid="teacher-class"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={20}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="e.g. CS1-BLUE"
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={`${INPUT} font-mono uppercase placeholder:normal-case`}
          />
        </div>
        <button type="submit" data-testid="teacher-open" className={BTN_PRIMARY}>Open class</button>
      </form>
      {error && <p id={errorId} role="alert" className="mt-2 text-sm text-rose-200"><Icon name="warning" className="mr-1" />{error}</p>}
      {saved.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-300">Saved in this browser:</span>
          {saved.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => onOpen(code)}
              aria-pressed={code === current}
              className={`rounded-full border px-3 py-1 font-mono ${code === current ? "border-cyan-400 bg-cyan-400/15 text-cyan-100" : "border-slate-600 text-slate-200 hover:bg-slate-800"}`}
            >
              {code} <span className="text-slate-300">({store.classes[code].length})</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function ClassView({
  classCode,
  codes,
  floors,
  onCodes,
  onDelete,
}: {
  classCode: string;
  codes: string[];
  floors: FloorInfo[];
  onCodes: (codes: string[]) => void;
  onDelete: () => void;
}) {
  const students = useMemo(() => studentsFromCodes(codes, classCode), [codes, classCode]);
  const reports = students.map((s) => s.report);
  const floorById = new Map(floors.map((f) => [f.id, f]));
  const floorLabel = (id: string) => floorById.get(id)?.short ?? id;

  return (
    <>
      <AddReports
        classCode={classCode}
        onAdd={(incoming) => {
          const merged = mergeStudents(students, incoming);
          onCodes(merged.students.map((s) => s.code));
          return merged;
        }}
      />
      {students.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-slate-300" data-testid="teacher-empty">
          No reports for <span className="font-mono text-white">{classCode}</span> yet. Paste your students&apos; codes above.
        </p>
      ) : (
        <>
          <Averages reports={reports} floorById={floorById} />
          <StudentTable students={students} floorLabel={floorLabel} />
          <StudentCards students={students} floorLabel={floorLabel} onRemove={(s) => onCodes(students.filter((x) => x !== s).map((x) => x.code))} />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="teacher-csv"
              className={BTN_PRIMARY}
              onClick={() => downloadText(csvFileName(classCode, dayKey(new Date())), classCsv(reports, floorLabel), "text/csv;charset=utf-8")}
            >
              ⬇️ Download CSV
            </button>
            <DeleteClass classCode={classCode} onDelete={onDelete} />
          </div>
        </>
      )}
    </>
  );
}

function AddReports({ classCode, onAdd }: { classCode: string; onAdd: (s: Student[]) => { added: number; updated: number; skipped: number } }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ message: string; problems: Problem[] } | null>(null);
  const textId = useId();
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const add = (source: string) => {
    const { students, problems } = parseReportCodes(source, classCode);
    const r = onAdd(students);
    const parts = [`${r.added} added`, `${r.updated} updated`];
    if (r.skipped) parts.push(`${r.skipped} already up to date`);
    setResult({ message: `${parts.join(", ")}.`, problems });
    if (problems.length === 0) setText("");
  };

  return (
    <section aria-labelledby="add-title" className={CARD}>
      <h2 id="add-title" className="text-lg font-bold text-white">
        Add reports to <span className="font-mono text-cyan-200" data-testid="teacher-current-class">{classCode}</span>
      </h2>
      <form
        className="mt-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(text);
        }}
      >
        <label htmlFor={textId} className="text-sm font-semibold text-slate-200">Report codes, one per line</label>
        <textarea
          id={textId}
          data-testid="teacher-codes"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          spellCheck={false}
          autoComplete="off"
          placeholder={"DJR1.…\nDJR1.…"}
          className={`${INPUT} font-mono text-xs`}
        />
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="submit" data-testid="teacher-add" className={BTN_PRIMARY} disabled={!text.trim()}>Add reports</button>
          <div className="min-w-0">
            <label htmlFor={fileId} className="text-sm text-slate-300">…or a text file of codes</label>
            <input
              id={fileId}
              ref={fileRef}
              type="file"
              accept=".txt,.csv,text/plain"
              data-testid="teacher-file"
              onChange={async (e) => {
                const file = e.currentTarget.files?.[0];
                if (!file) return;
                add(file.size > 2_000_000 ? "" : await file.text());
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="mt-1 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-slate-600"
            />
          </div>
        </div>
      </form>
      <div role="status" aria-live="polite" data-testid="teacher-add-result" className="mt-3 text-sm text-emerald-200">
        {result?.message}
      </div>
      {result && result.problems.length > 0 && (
        <div role="alert" data-testid="teacher-problems" className="mt-2 rounded-lg border border-amber-400/40 bg-amber-950/40 p-3 text-sm text-amber-100">
          <p className="font-semibold">Some lines weren&apos;t added:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {result.problems.map((p) => (
              <li key={p.line}>Line {p.line}: {p.message}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Averages({ reports, floorById }: { reports: ClassReport[]; floorById: Map<string, FloorInfo> }) {
  const s = classSummary(reports);
  return (
    <section aria-labelledby="avg-title" className={CARD} data-testid="teacher-averages">
      <h2 id="avg-title" className="text-lg font-bold text-white">Class averages</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Students" value={String(s.students)} testId="avg-students" />
        <Stat label="Tickets merged" value={num(s.avgTickets)} testId="avg-tickets" hint="per student" />
        <Stat label="Byte catch rate" value={pct(s.catchRate)} testId="avg-catch" hint={`${s.catchRateStudents} student${s.catchRateStudents === 1 ? "" : "s"} with Byte bugs`} />
        <Stat label="Skills check gain" value={s.avgGain === null ? "–" : `${s.avgGain > 0 ? "+" : ""}${num(s.avgGain)}`} testId="avg-gain" hint={`${s.gainStudents} with baseline + final`} />
      </dl>
      <h3 className="mt-5 text-sm font-semibold text-slate-200">Tickets merged per floor (average)</h3>
      <ul className="mt-2 space-y-2" data-testid="avg-floors">
        {s.floors.map((f) => {
          const info = floorById.get(f.id);
          const share = f.total ? f.avgMerged / f.total : 0;
          return (
            <li key={f.id} data-testid={`avg-floor-${f.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[14rem_minmax(0,1fr)_5rem]">
              <span className="truncate text-slate-200">
                <b className="text-white">{info?.short ?? f.id}</b>{info ? `: ${info.title}` : ""}
              </span>
              <span className="order-last col-span-2 h-2 overflow-hidden rounded-full bg-slate-800 sm:order-none sm:col-span-1" aria-hidden>
                <span className="block h-full rounded-full bg-slate-300" style={{ width: `${Math.round(share * 100)}%` }} />
              </span>
              <span className="text-right font-mono text-cyan-200">{num(f.avgMerged)}/{f.total}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-slate-300">Average XP: {num(s.avgXp, 0)}. Catch rate = Byte&apos;s wrong suggestions a student rejected or fixed, out of all they met.</p>
    </section>
  );
}

function Stat({ label, value, hint, testId }: { label: string; value: string; hint?: string; testId: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <dt className="text-xs text-slate-300">{label}</dt>
      <dd className="mt-1 font-mono text-xl font-bold text-white" data-testid={testId}>{value}</dd>
      {hint && <dd className="text-xs text-slate-400">{hint}</dd>}
    </div>
  );
}

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "name", label: "Student", numeric: false },
  { key: "tickets", label: "Tickets", numeric: true },
  { key: "xp", label: "XP", numeric: true },
  { key: "catch", label: "Byte catch rate", numeric: true },
  { key: "baseline", label: "Skills baseline", numeric: true },
  { key: "final", label: "Skills final", numeric: true },
  { key: "gain", label: "Gain", numeric: true },
  { key: "lastActive", label: "Last active", numeric: false },
];

function StudentTable({ students, floorLabel }: { students: Student[]; floorLabel: (id: string) => string }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const rows = sortStudents(students, sort.key, sort.dir);
  return (
    <section aria-labelledby="table-title" className={CARD}>
      <h2 id="table-title" className="text-lg font-bold text-white">Students</h2>
      <p className="mt-1 text-sm text-slate-300">Select a column heading to sort.</p>
      {/* Scrolls sideways on phones; focusable so keyboard users can scroll it too. */}
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800" tabIndex={0} role="region" aria-label="Students table, scrolls sideways">
        <table className="w-full min-w-[44rem] text-left text-sm" data-testid="teacher-table">
          <caption className="sr-only">One row per student, sorted by {COLUMNS.find((c) => c.key === sort.key)?.label} ({sort.dir === "asc" ? "ascending" : "descending"})</caption>
          <thead className="bg-slate-950/70 text-xs text-slate-300">
            <tr>
              {COLUMNS.map((c) => {
                const active = sort.key === c.key;
                return (
                  <th key={c.key} scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={`px-3 py-2 ${c.numeric ? "text-right" : ""}`}>
                    <button
                      type="button"
                      data-testid={`sort-${c.key}`}
                      onClick={() => setSort(active ? { key: c.key, dir: sort.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: c.numeric ? "desc" : "asc" })}
                      className={`inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300 ${active ? "text-cyan-200" : ""}`}
                    >
                      {c.label}
                      <span aria-hidden>{active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ report: r }) => (
              <tr key={r.name} data-testid="teacher-row" className="border-t border-slate-800 odd:bg-slate-900/40">
                <th scope="row" className="px-3 py-2 font-semibold text-white">{r.name}</th>
                <td className="px-3 py-2 text-right font-mono" title={r.seasons.map((s) => `${floorLabel(s.id)}: ${s.merged}/${s.total}`).join(", ")}>
                  {ticketsMerged(r)}
                </td>
                <td className="px-3 py-2 text-right font-mono">{r.xp}</td>
                <td className="px-3 py-2 text-right font-mono">{pct(catchRate(r))}</td>
                <td className="px-3 py-2 text-right font-mono">{r.skills.baseline ?? "–"}</td>
                <td className="px-3 py-2 text-right font-mono">{r.skills.final ?? "–"}</td>
                <td className="px-3 py-2 text-right font-mono">{signed(skillsGain(r))}</td>
                <td className="px-3 py-2 font-mono whitespace-nowrap">{r.lastActive ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StudentCards({ students, floorLabel, onRemove }: { students: Student[]; floorLabel: (id: string) => string; onRemove: (s: Student) => void }) {
  return (
    <section aria-labelledby="cards-title">
      <h2 id="cards-title" className="text-lg font-bold text-white">Student cards</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sortStudents(students, "name", "asc").map((s) => {
          const r = s.report;
          return (
            <li key={r.name} data-testid="teacher-card" className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-white">{r.name}</h3>
                  <p className="text-xs text-slate-300">Last active {r.lastActive ?? "never"}, report from {r.generatedOn}</p>
                </div>
                <span className="shrink-0 font-mono text-sm text-cyan-200">{r.xp} XP</span>
              </div>
              <ul className="mt-3 space-y-1 text-xs" aria-label={`${r.name}: tickets merged per floor`}>
                {r.seasons.map((f) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-slate-300">{floorLabel(f.id)}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800" aria-hidden>
                      <span className="block h-full rounded-full bg-slate-300" style={{ width: `${f.total ? Math.round((f.merged / f.total) * 100) : 0}%` }} />
                    </span>
                    <span className="w-10 shrink-0 text-right font-mono text-slate-200">{f.merged}/{f.total}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-950/50 p-2">
                  <dt className="text-slate-300">Byte bugs caught</dt>
                  <dd className="font-mono text-white">{r.byte.caught}/{r.byte.caught + r.byte.wavedThrough} ({pct(catchRate(r))})</dd>
                </div>
                <div className="rounded-lg bg-slate-950/50 p-2">
                  <dt className="text-slate-300">Best prompts</dt>
                  <dd className="font-mono text-white">{r.byte.bestPrompts}/{r.byte.promptsTried}</dd>
                </div>
                <div className="col-span-2 rounded-lg bg-slate-950/50 p-2">
                  <dt className="text-slate-300">Skills check</dt>
                  <dd className="font-mono text-white">
                    {r.skills.baseline === null && r.skills.final === null
                      ? "not taken"
                      : `${r.skills.baseline ?? "–"} → ${r.skills.final ?? "–"}${r.skills.total ? ` /${r.skills.total}` : ""}${skillsGain(r) !== null ? ` (${signed(skillsGain(r))})` : ""}`}
                  </dd>
                </div>
              </dl>
              <button type="button" onClick={() => onRemove(s)} className="mt-3 rounded-lg px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white" aria-label={`Remove ${r.name} from this class`}>
                Remove
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DeleteClass({ classCode, onDelete }: { classCode: string; onDelete: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" className={BTN_SECONDARY} onClick={() => setAsking(true)}>
        Delete this class from this browser…
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm text-slate-200" role="group" aria-label="Confirm delete">
      Delete {classCode} and all its reports from this browser?
      <button type="button" onClick={onDelete} className="rounded-xl bg-rose-700 px-3 py-2 font-semibold text-white hover:bg-rose-600">Delete</button>
      <button type="button" onClick={() => setAsking(false)} className={BTN_SECONDARY}>Keep it</button>
    </span>
  );
}
