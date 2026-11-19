"use client";
// "The app you're building": a phone mock-up of Orbit Orders. Each merged
// ticket switches on (or repairs) the part of the app it touched, so progress
// is something you can see, not just a counter.
// Season 1 only for now; the mapping is keyed by ticket id.
import type { ReactNode } from "react";

type Props = { solved: Set<string> };

function Feature({ on, label, children }: { on: boolean; label: string; children: ReactNode }) {
  return (
    <div
      title={on ? `Shipped: ${label}` : `Not shipped yet: ${label}`}
      className={`rounded-xl transition ${on ? "" : "pointer-events-none opacity-30 grayscale"}`}
    >
      {children}
    </div>
  );
}

export default function AppPreview({ solved }: Props) {
  const has = (n: number) => solved.has(`s01-t${String(n).padStart(2, "0")}`);
  const shipped = Array.from({ length: 10 }, (_, i) => has(i + 1)).filter(Boolean).length;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-white">📱 The app you&apos;re building</h2>
        <span className="text-xs text-slate-400">{shipped}/10 features shipped</span>
      </div>
      <p className="mt-1 text-sm text-slate-400">Every ticket you merge fixes or adds a piece of the real Orbit Orders app.</p>

      <div className="mx-auto mt-4 w-full max-w-[280px] rounded-[2.2rem] border-4 border-slate-700 bg-slate-950 p-3 shadow-xl" data-testid="app-preview">
        <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-slate-700" />
        <div className="space-y-2 rounded-2xl bg-white p-3 text-[13px] text-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-bold text-violet-700">🛰️ Orbit Orders</span>
            <Feature on={has(5)} label="cart badge">
              <span className="rounded-full bg-violet-600 px-2 py-0.5 text-xs font-bold text-white">🛒 3</span>
            </Feature>
          </div>
          <Feature on={has(1)} label="greeting by name">
            <p className="font-medium">Welcome back to Orbit Orders, Sam!</p>
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
          <Feature on={has(4) && has(9)} label="checkout summary">
            <div className="rounded-lg bg-slate-100 p-2 font-mono text-xs">
              <div className="flex justify-between"><span>Subtotal</span><span>$27.99</span></div>
              <div className="flex justify-between text-emerald-700"><span>Discount</span><span>−$5.59</span></div>
              <div className="flex justify-between"><span>Delivery</span><span>$0.00</span></div>
              <div className="mt-1 flex justify-between border-t border-slate-300 pt-1 font-bold"><span>Total</span><span>$22.40</span></div>
            </div>
          </Feature>
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
