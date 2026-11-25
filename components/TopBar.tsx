"use client";
// The bar on every page. Phones (audit flaw 7): all four destinations stay in the
// nav, Profile included ("Board" is the short label for the leaderboard). The
// streak lives on the home screen's Today line on a phone, so the bar fits 360 px.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsClient } from "@/lib/useIsClient";
import { currentStreak, rankFor } from "@/lib/game/rules";
import { totalXp, useProgress } from "@/lib/progress/store";

const NAV = [
  { href: "/", label: "Office" },
  { href: "/skills", label: "Skills" },
  { href: "/leaderboard", label: "Leaderboard", short: "Board" },
  { href: "/profile", label: "Profile", testId: "profile-link" },
];

export default function TopBar() {
  const progress = useProgress();
  const xp = totalXp(progress);
  const { rank, next, progress: pct } = rankFor(xp);
  const pathname = usePathname() ?? "/";
  // Streak depends on today's date, so compute it only in the browser.
  const isClient = useIsClient();
  const streak = isClient ? currentStreak(progress.activeDays, new Date()) : 0;
  const here = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-page/95 backdrop-blur print:hidden">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-1 px-2 sm:gap-4 sm:px-4">
        <Link href="/" data-testid="logo" className="hidden shrink-0 items-center gap-2 rounded-md font-display font-bold text-ink md:flex">
          <OrbitMark />
          <span>Orbit Orders</span>
        </Link>
        <nav aria-label="Main" className="flex min-w-0 items-center text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              data-testid={n.testId}
              aria-current={here(n.href) ? "page" : undefined}
              className={`relative rounded-md px-2 py-2 whitespace-nowrap sm:px-3 ${
                here(n.href) ? "font-semibold text-ink" : "text-slate-300 hover:bg-slate-800 hover:text-ink"
              }`}
            >
              {n.short ? (
                <>
                  <span className="sm:hidden">{n.short}</span>
                  <span className="hidden sm:inline">{n.label}</span>
                </>
              ) : (
                n.label
              )}
              {here(n.href) && <span aria-hidden className="absolute inset-x-2 -bottom-[9px] h-0.5 rounded-full bg-signal sm:inset-x-3" />}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 text-sm sm:gap-3">
          <span title="Daily streak" data-testid="streak" className="hidden items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-1 font-semibold whitespace-nowrap text-orange-300 sm:inline-flex">
            <span className={streak > 0 ? "flame" : "opacity-50 grayscale"} aria-hidden>🔥</span> {streak}
            <span className="sr-only"> day streak</span>
          </span>
          <div className="flex items-center gap-2" title={next ? `${next.minXp - xp} XP to ${next.title}` : "Max rank"}>
            <div className="hidden w-36 lg:block">
              <div className="text-xs whitespace-nowrap text-slate-300">
                <span aria-hidden>{rank.emoji}</span> {rank.title}
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800" aria-hidden>
                <div className="h-full rounded-full bg-signal transition-all" style={{ width: `${Math.round(pct * 100)}%` }} />
              </div>
            </div>
            <span className="text-sm font-semibold whitespace-nowrap text-ink tabular-nums" data-testid="xp-total">
              {xp} XP
            </span>
          </div>
          <Link
            href="/settings"
            data-testid="settings-link"
            aria-label="Settings and progress backup"
            title="Settings and backup"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-base text-slate-300 hover:bg-slate-800 hover:text-ink sm:text-lg"
          >
            <span aria-hidden>⚙️</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

/** The Orbit Orders mark: an order dot on its orbit. Pure CSS, no image. */
export function OrbitMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <span aria-hidden className={`relative grid shrink-0 place-items-center rounded-full border-2 border-signal ${className}`}>
      <span className="h-2 w-2 rounded-full bg-ink" />
      <span className="absolute -top-[3px] right-[1px] h-2 w-2 rounded-full bg-signal" />
    </span>
  );
}
