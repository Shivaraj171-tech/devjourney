// Light / dark theme. "system" (the default) follows the OS setting through CSS
// alone; "light" or "dark" is stored in this browser and set as data-theme on
// <html> before the first paint (THEME_SCRIPT, inlined in app/layout.tsx).

export type ThemeChoice = "system" | "light" | "dark";
export const THEME_KEY = "devjourney:theme";

/** Runs in <head> before the page paints. Kept tiny and dependency-free. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export function readTheme(): ThemeChoice {
  try {
    const t = window.localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(choice: ThemeChoice) {
  try {
    if (choice === "system") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Storage blocked: still apply it for this page view.
  }
  if (choice === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", choice);
  window.dispatchEvent(new Event("devjourney:theme"));
}

/** The theme actually shown right now (resolving "system"). */
export function effectiveTheme(): "light" | "dark" {
  const set = document.documentElement.getAttribute("data-theme");
  if (set === "light" || set === "dark") return set;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
