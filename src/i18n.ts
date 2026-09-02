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

/** Translate an English source string into the active language. */
export function t(en: string): string {
  if (active === "fr") return fr[en] ?? en;
  return en;
}

export function registerFr(dictionary: Record<string, string>) {
  Object.assign(fr, dictionary);
}

export const LangContext = createContext<Lang>("en");

export function useLang(): Lang {
  return useContext(LangContext);
}
