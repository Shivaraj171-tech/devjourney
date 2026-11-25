"use client";
// "The app you're building": a phone mock-up of Orbit Orders. Each merged
// ticket switches on (or repairs) the part of the app it touched, so progress
// is something you can see, not just a counter.
// The mapping is keyed by ticket id; tickets that don't change what customers
// see (reviews, tests, refactors) aren't listed.
import type { ReactNode } from "react";

type Props = { solved: Set<string>; playerName: string; /** Inside a fold that already has the title and border. */ bare?: boolean };

function Feature({ on, label, children }: { on: boolean; label: string; children: ReactNode }) {
  return (
    <div title={on ? `Shipped: ${label}` : `Not shipped yet: ${label}`} className={`relative rounded-xl ${on ? "" : "pointer-events-none"}`}>
      {/* Not shipped yet: a dashed outline the size of the feature, with its text hidden
          (it was dimmed to 1.6:1, unreadable text that failed contrast; audit flaw 9). */}
      <div className={on ? "" : "invisible"}>{children}</div>
      {!on && <div aria-hidden className="absolute inset-0 rounded-lg border border-dashed border-slate-400 bg-slate-100/60" />}
    </div>
  );
}

/** Ticket ids that switch on something visible in the app. */
const FEATURE_TICKETS = [
  "s01-t01", "s01-t02", "s01-t03", "s01-t04", "s01-t05", "s01-t06", "s01-t08", "s01-t09", "s01-t10",
  "s02-t02", "s02-t03", "s02-t04", "s03-t02", "s03-t05", "s03-t06",
];

export default function AppPreview({ solved, playerName, bare = false }: Props) {
  const customer = playerName && playerName !== "You" ? playerName : "Sam";
  const has = (n: number, season = 1) => solved.has(`s0${season}-t${String(n).padStart(2, "0")}`);
  const shipped = FEATURE_TICKETS.filter((id) => solved.has(id)).length;

  return (
    <section className={bare ? "px-5 pb-5" : "rounded-xl border border-rule bg-panel p-5"}>
      <div className="flex items-baseline justify-between gap-3">
        {!bare && <h3 className="font-display text-lg font-bold text-ink">📱 The app you&apos;re building</h3>}
        <span className="text-sm text-slate-300">{shipped}/{FEATURE_TICKETS.length} features shipped</span>
      </div>
      <p className="mt-1 text-sm text-slate-300">Every ticket you merge fixes or adds a piece of the real Orbit Orders app.</p>

      {/* A picture of the app: the dimmed parts are features not shipped yet (decorative, so one
          text alternative instead of 29 low-contrast labels; audit flaw 9). */}
      <div
        className="mx-auto mt-4 w-full max-w-[280px] rounded-[2.2rem] border-4 border-slate-700 bg-slate-950 p-3 shadow-xl"
        data-testid="app-preview"
        role="img"
        aria-label={`Preview of the Orbit Orders app: ${shipped} of ${FEATURE_TICKETS.length} features shipped so far.`}
      >
        <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-slate-700" />
        <div className="space-y-2 rounded-2xl bg-white p-3 text-[13px] text-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-bold text-violet-700">🛰️ Orbit Orders</span>
            <Feature on={has(5)} label="cart badge">
              <span className="rounded-full bg-violet-600 px-2 py-0.5 text-xs font-bold text-white">🛒 3</span>
            </Feature>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Feature on={has(3, 2)} label="Noodle Nook back online">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">🍜 Noodle Nook · open</span>
            </Feature>
            <Feature on={has(4, 2)} label="Top rated badge">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">⭐ Top rated</span>
            </Feature>
            <Feature on={has(5, 3)} label="fast checkout at lunch rush">
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] text-sky-800">⚡ Fast checkout</span>
            </Feature>
          </div>
          <Feature on={has(1)} label="greeting by name">
            <p className="font-medium">Welcome back to Orbit Orders, {customer}!</p>
          </Feature>
          <Feature on={has(3)} label="free delivery over $25">
            <p className="rounded-lg bg-emerald-100 px-2 py-1 text-xs text-emerald-800">🚚 Free delivery on orders of $25 or more</p>
          </Feature>
          <Feature on={has(2)} label="menu prices">
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
              {[["🍕 Margherita", "$12.50"], ["🥖 Garlic bread", "$4.50"], ["🍋 Lemonade", "$2.99"]].map(([n, p]) => (
                <li key={n} className="flex justify-between px-2 py-1">
                  <span>{n}</span>
                  <span className="font-mono">{p}</span>
                </li>
              ))}
            </ul>
          </Feature>
          <div className="flex gap-2">
            <Feature on={has(6)} label="order again">
              <span className="block rounded-lg border border-violet-300 px-2 py-1 text-xs text-violet-700">↻ Order again</span>
            </Feature>
            <Feature on={has(8)} label="promo codes">
              <span className="block rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-500">🏷️ Promo code</span>
            </Feature>
          </div>
          <Feature on={has(2, 2)} label="rider tips">
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-500">Tip your rider:</span>
              {["10%", "15%", "20%"].map((t) => (
                <span key={t} className={`rounded-md border px-1.5 py-0.5 ${t === "15%" ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-300"}`}>{t}</span>
              ))}
            </div>
          </Feature>
          <Feature on={has(4) && has(9)} label="checkout summary">
            <div className="rounded-lg bg-slate-100 p-2 font-mono text-xs">
              <div className="flex justify-between"><span>Subtotal</span><span>$27.99</span></div>
              <div className="flex justify-between text-emerald-700"><span>Discount</span><span>−$5.59</span></div>
              <div className="flex justify-between"><span>Delivery</span><span>$0.00</span></div>
              <div className="mt-1 flex justify-between border-t border-slate-300 pt-1 font-bold"><span>Total</span><span>$22.40</span></div>
            </div>
          </Feature>
          <div className="flex gap-2">
            <Feature on={has(2, 3)} label="order tracking survives restarts">
              <span className="block rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600">📦 Track order #1001</span>
            </Feature>
            <Feature on={has(6, 3)} label="SMS receipts">
              <span className="block rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600">📱 SMS receipt</span>
            </Feature>
          </div>
          <Feature on={has(10)} label="separate orders per customer">
            <span className="block w-full rounded-lg bg-violet-600 py-1.5 text-center text-xs font-bold text-white">Place order</span>
          </Feature>
        </div>
      </div>
      {has(7) && !has(8) && (
        <p className="mt-3 text-center text-xs text-amber-300">You read the promo code module. Next up: make it safe to use.</p>
      )}
    </section>
  );
}
