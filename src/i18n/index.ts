import { createI18n } from "vue-i18n";

import en from "./locales/en";
import pt from "./locales/pt";

/**
 * Internationalisation.
 *
 * The application is built for a Portuguese school, so **Portuguese is the
 * default and the reference language**, not a translation layer bolted onto an
 * English product. English is the second supported language, and it is also the
 * fallback: when a Portuguese key is missing the English string is rendered
 * rather than the raw key, because a reader who sees one English label can still
 * work, and a reader who sees `student.dashboard.title` cannot.
 *
 * Every user-facing string lives in `locales/pt.ts` and `locales/en.ts`, which
 * are the same tree of keys in two languages. Components read them with `$t` in
 * templates (`globalInjection` is on, so there is no per-component setup) and
 * with the exported `t` in script blocks. `t` reads the locale ref, so any
 * `computed` that calls it re-evaluates when the language changes — which is why
 * option lists and label maps are computed rather than module constants.
 *
 * Adding a language means adding one file and one row in `SUPPORTED_LOCALES`.
 * Nothing in a component has to change.
 */

export type AppLocale = "pt" | "en";

export interface LocaleDescriptor {
  value: AppLocale;
  /** Written in its own language — a language list nobody has to translate. */
  label: string;
  /** BCP 47 tag, used for `Intl` date and number formatting and `<html lang>`. */
  tag: string;
}

export const SUPPORTED_LOCALES: LocaleDescriptor[] = [
  { value: "pt", label: "Português", tag: "pt-PT" },
  { value: "en", label: "English", tag: "en-GB" },
];

const STORAGE_KEY = "picaponto.locale";

/** Portuguese, because the people using this are at a Portuguese school. */
export const DEFAULT_LOCALE: AppLocale = "pt";

function isSupported(value: string | null): value is AppLocale {
  return SUPPORTED_LOCALES.some((locale) => locale.value === value);
}

/**
 * The stored choice, or Portuguese.
 *
 * The browser's language is deliberately **not** consulted. This is a product
 * for one Portuguese school, and a lab machine imaged with an English Windows
 * install is not evidence that the student in front of it wants an English
 * interface — it is evidence about the machine. Defaulting to Portuguese and
 * letting anybody switch in one click is both more often right and easier to
 * explain than a rule nobody can see.
 */
function readInitialLocale(): AppLocale {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (isSupported(stored)) {
      return stored;
    }
  }

  return DEFAULT_LOCALE;
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: readInitialLocale(),
  fallbackLocale: "en",
  messages: { pt, en },
  missingWarn: import.meta.env.DEV,
  fallbackWarn: false,
});

/**
 * Translate outside a template.
 *
 * Bound to the global composer rather than obtained from `useI18n()`, so it can
 * be called from stores, helpers and `computed` bodies without every one of them
 * having to be inside a component's setup.
 */
export const t = i18n.global.t as unknown as {
  (key: string): string;
  (key: string, named: Record<string, unknown>): string;
  /**
   * The plural form. vue-i18n picks between the `|`-separated variants in the
   * message using `plural`, which is passed separately from the interpolation
   * values because a count can appear in the sentence *and* choose the form —
   * "1 tarefa" / "3 tarefas" needs both.
   */
  (key: string, named: Record<string, unknown>, plural: number): string;
};

/** Does a key exist in the active locale or the fallback? Used by label helpers. */
export function hasTranslation(key: string): boolean {
  return i18n.global.te(key) || i18n.global.te(key, "en");
}

export function currentLocale(): AppLocale {
  return i18n.global.locale.value as AppLocale;
}

/** BCP 47 tag for the active language, for `Intl` formatters. */
export function currentLocaleTag(): string {
  const active = currentLocale();

  return SUPPORTED_LOCALES.find((locale) => locale.value === active)?.tag ?? "pt-PT";
}

function applyToDocument(locale: AppLocale) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = SUPPORTED_LOCALES.find((item) => item.value === locale)?.tag ?? locale;
  }
}

export function setLocale(next: AppLocale, persist = true) {
  i18n.global.locale.value = next;

  if (persist && typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, next);
  }

  applyToDocument(next);
}

/** Called once before mount, so the first paint is already in the right language. */
export function initLocale() {
  applyToDocument(currentLocale());
}

export default i18n;
