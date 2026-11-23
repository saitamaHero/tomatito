import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";
import { DEFAULT_SETTINGS, normalizeSettings } from "../core/settings";
import type { Settings } from "../core/types";
import { repo } from "../data";
import { platform } from "../platform";

export const useSettingsStore = defineStore("settings", () => {
  const values = shallowRef<Settings>({ ...DEFAULT_SETTINGS });
  /** Motivo por el que el sistema rechazó el atajo global. */
  const shortcutError = ref<string | null>(null);

  async function load() {
    values.value = normalizeSettings(await repo().loadSettings());
  }

  async function save(next: Settings) {
    values.value = normalizeSettings(next);
    await repo().saveSettings(values.value);
  }

  async function applyShortcut(enabled: boolean): Promise<boolean> {
    shortcutError.value = await platform().setGlobalShortcut(enabled);
    return shortcutError.value === null;
  }

  return { values, shortcutError, load, save, applyShortcut };
});
