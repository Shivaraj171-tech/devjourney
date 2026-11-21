// What the coding profile (lib/game/profile.ts) needs to know about the content:
// per ticket its concepts, lesson / practice items and edge-case checks; per warm-up
// its concept. No code, tests or answers. Server-only (reads content/ at build time).
import { listChecks } from "./checks";
import { loadSeasons, loadWarmups } from "./load";
import { formatKey } from "../game/formats";
import { conceptKey, type ProfileContent } from "../game/profile";
import { isBoundaryCheck } from "../game/runLog";

export function profileContent(): ProfileContent {
  const tickets = loadSeasons().flatMap((s) =>
    s.tickets.map((t) => {
      const f = t.formats;
      const formats = f
        ? [
            ...f.predict.map((_, i) => formatKey("predict", i)),
            ...f.breakIt.map((_, i) => formatKey("break_it", i)),
            ...f.parsons.map((_, i) => formatKey("parsons", i)),
            ...(f.trace ?? []).map((_, i) => formatKey("trace", i)),
          ]
        : [];
      return {
        id: t.id,
        number: t.number,
        title: t.title,
        seasonTitle: s.title,
        concept: s.final ? "" : conceptKey(t.newConcept),
        concepts: t.concepts.map(conceptKey),
        type: t.type,
        bounty: !!t.bounty,
        final: s.final,
        hasLesson: !!t.concept,
        formats,
        boundaryChecks: listChecks(t.tests)
          .map((c) => c.name)
          .filter(isBoundaryCheck),
        requires: t.bounty?.requires?.id ?? null,
      };
    }),
  );
  const warmups = loadWarmups().map((w) => ({ id: w.id, title: w.title, concept: w.concept, after: w.after }));
  return { tickets, warmups };
}
