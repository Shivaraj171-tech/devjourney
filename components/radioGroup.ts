// Keyboard behaviour for `role="radiogroup"` groups built from buttons (WAI-ARIA APG radio
// group): one Tab stop (the checked radio, or the first one when none is checked), and the
// arrow keys move focus AND the selection to the next or previous radio, wrapping around.
// Home and End go to the first and last radio.
import type { KeyboardEvent } from "react";

/** tabIndex for radio `index` of a group whose checked index is `checked` (-1 or null: none). */
export function radioTabIndex(index: number, checked: number | null): 0 | -1 {
  if (checked === null || checked < 0) return index === 0 ? 0 : -1;
  return index === checked ? 0 : -1;
}

/** Put this on the radiogroup element: `onKeyDown={onRadioGroupKeyDown}`. */
export function onRadioGroupKeyDown(e: KeyboardEvent<HTMLElement>) {
  const radios = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')).filter(
    (r) => !r.hasAttribute("disabled") && r.getAttribute("aria-disabled") !== "true",
  );
  if (radios.length === 0) return;
  const at = radios.indexOf(document.activeElement as HTMLElement);
  let next: number | null = null;
  if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (at + 1) % radios.length;
  else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (at - 1 + radios.length) % radios.length;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = radios.length - 1;
  if (next === null) return;
  e.preventDefault();
  radios[next].focus();
  radios[next].click(); // selection follows focus
}
