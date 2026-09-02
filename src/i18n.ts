import { createContext, useContext } from "react";

// Minimal, dependency-free i18n. English source strings are the keys: `t()`
// looks up the active dictionary and falls back to the key itself, so a
// missing translation degrades to English instead of breaking. The choice is
// persisted through the app's settings store (get_setting / set_setting).

export type Lang = "en" | "fr";

let active: Lang = "en";

const fr: Record<string, string> = {};

export function setLang(l: Lang) {
  active = l;
}

export function getLang(): Lang {
  return active;
}

/** BCP-47 locale matching the active UI language, for date/number formatting. */
export function dateLocale(): string {
  return active === "fr" ? "fr-FR" : "en-GB";
}

/** Translate an English source string into the active language. Optional
 * `{key}` placeholders are filled from `vars` after translation. */
export function t(en: string, vars?: Record<string, string | number>): string {
  let s = active === "fr" ? (fr[en] ?? en) : en;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

export function registerFr(dictionary: Record<string, string>) {
  Object.assign(fr, dictionary);
}

export const LangContext = createContext<Lang>("en");

export function useLang(): Lang {
  return useContext(LangContext);
}
