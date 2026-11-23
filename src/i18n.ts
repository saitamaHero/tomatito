import { computed, shallowRef } from "vue";
import { MESSAGES, type Locale } from "./core/i18n";

export const locale = shallowRef<Locale>("en");

/** Textos en el idioma actual. En las plantillas, `m.history.title`. */
export const m = computed(() => MESSAGES[locale.value]);

export function setLocale(next: Locale): void {
  locale.value = next;
  document.documentElement.lang = next;
}
