import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";
import { resolveLocale } from "../core/i18n";
import { DEFAULT_SETTINGS, normalizeSettings } from "../core/settings";
import type { Settings } from "../core/types";
import { repo } from "../data";
import { setLocale } from "../i18n";
import { platform } from "../platform";
import type { ShortcutProblem } from "../platform/types";

export const useSettingsStore = defineStore("settings", () => {
  const values = shallowRef<Settings>({ ...DEFAULT_SETTINGS });
  /** Motivo por el que el sistema rechazó el atajo global. */
  const shortcutError = ref<ShortcutProblem | null>(null);

  function applyLocale() {
    setLocale(resolveLocale(values.value.language, navigator.languages));
  }

  async function load() {
    values.value = normalizeSettings(await repo().loadSettings());
    applyLocale();
    // Solo cuenta si el idioma sigue al del sistema.
    window.addEventListener("languagechange", applyLocale);
  }

  async function save(next: Settings) {
    values.value = normalizeSettings(next);
    applyLocale();
    await repo().saveSettings(values.value);
  }

  async function applyShortcut(enabled: boolean): Promise<boolean> {
    shortcutError.value = await platform().setGlobalShortcut(enabled);
    return shortcutError.value === null;
  }

  return { values, shortcutError, load, save, applyShortcut };
});
