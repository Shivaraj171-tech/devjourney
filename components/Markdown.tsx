// Tiny Markdown renderer for our own story/hint text.
// Supports paragraphs, line breaks, **bold**, *italic*, `code` and fenced
// ``` code blocks. That's all the content uses; a full Markdown library isn't needed yet.
import { Fragment, type ReactNode } from "react";

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("`")) {
      out.push(
        <code key={key} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[0.9em] text-amber-200">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      out.push(<strong key={key} className="font-semibold text-white">{token.slice(2, -2)}</strong>);
    } else {
      out.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Split text into prose and ``` fenced code blocks. */
function blocks(text: string): { code: boolean; body: string }[] {
  const out: { code: boolean; body: string }[] = [];
  const parts = text.trim().split(/^```[^\n]*\n?/m);
  // Even parts are prose, odd parts are code (between opening and closing fences).
  parts.forEach((body, i) => out.push({ code: i % 2 === 1, body: i % 2 === 1 ? body.replace(/\n$/, "") : body }));
  return out;
}

export default function Markdown({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`space-y-3 leading-relaxed ${className}`}>
      {blocks(text).map((block, b) =>
        block.code ? (
          <pre key={b} className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[13px] leading-snug text-slate-200">
            {block.body}
          </pre>
        ) : (
          block.body
            .trim()
            .split(/\n\s*\n/)
            .filter(Boolean)
            .map((para, p) => (
              <p key={`${b}-${p}`}>
                {para.split("\n").map((line, l) => (
                  <Fragment key={l}>
                    {l > 0 && <br />}
                    {inline(line, `${b}-${p}-${l}`)}
                  </Fragment>
                ))}
              </p>
            ))
        ),
      )}
    </div>
  );
}
