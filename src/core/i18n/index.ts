import type { Language } from "../types";
import { en } from "./en";
import { es, type Messages } from "./es";

export type { Messages };

/** Para añadir un idioma: su archivo, una línea aquí y otra en LOCALE_NAMES. */
export const MESSAGES = { es, en } satisfies Record<string, Messages>;

export type Locale = keyof typeof MESSAGES;

/** Cada idioma, escrito en ese idioma. */
export const LOCALE_NAMES: Record<Locale, string> = { es: "Español", en: "English" };

export const LOCALES = Object.keys(MESSAGES) as Locale[];

/** `system` sigue los idiomas del equipo, por orden de preferencia. Si el primero no
    está traducido, inglés. */
export function resolveLocale(language: Language, systemLanguages: readonly string[]): Locale {
  if (language !== "system") return language;
  const base = systemLanguages[0]?.toLowerCase().split(/[-_]/)[0];
  return LOCALES.find((locale) => locale === base) ?? "en";
}
