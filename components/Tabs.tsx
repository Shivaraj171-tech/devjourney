"use client";
// An accessible tab list (WAI-ARIA tabs pattern): one tab in the Tab order,
// arrow keys / Home / End move between tabs and select them.
// The matching panels use `tabPanelProps` so aria-controls/labelledby line up.
import { useRef, type KeyboardEvent, type ReactNode } from "react";

export type TabItem<T extends string> = { id: T; label: ReactNode; testId?: string };

type Props<T extends string> = {
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  /** Prefix for the tab and panel element ids; unique per page. */
  idPrefix: string;
  /** Accessible name of the tab list. */
  label: string;
  className?: string;
  tabClassName: (active: boolean) => string;
};

export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const panelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

/** Props for the element that shows tab `id`'s content. */
export function tabPanelProps(prefix: string, id: string) {
  return { role: "tabpanel" as const, id: panelId(prefix, id), "aria-labelledby": tabId(prefix, id) };
}

export default function Tabs<T extends string>({ tabs, active, onChange, idPrefix, label, className = "", tabClassName }: Props<T>) {
  const refs = useRef(new Map<T, HTMLButtonElement>());

  function onKeyDown(e: KeyboardEvent) {
    const i = tabs.findIndex((t) => t.id === active);
    const next =
      e.key === "ArrowRight" ? (i + 1) % tabs.length
      : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length
      : e.key === "Home" ? 0
      : e.key === "End" ? tabs.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current.get(tabs[next].id)?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className={className} onKeyDown={onKeyDown}>
      {tabs.map((t) => (
        <button
          key={t.id}
          ref={(el) => {
            if (el) refs.current.set(t.id, el);
            else refs.current.delete(t.id);
          }}
          type="button"
          role="tab"
          id={tabId(idPrefix, t.id)}
          aria-controls={panelId(idPrefix, t.id)}
          aria-selected={active === t.id}
          tabIndex={active === t.id ? 0 : -1}
          data-testid={t.testId}
          onClick={() => onChange(t.id)}
          className={tabClassName(active === t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
