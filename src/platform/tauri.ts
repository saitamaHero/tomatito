import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import type { DesktopAction, FloatProblem, Platform, ShortcutProblem } from "./types";

export const platform: Platform = {
  kind: "desktop",

  async prepareNotifications() {
    if (!(await isPermissionGranted())) await requestPermission();
  },

  async notify(title, body) {
    if (await isPermissionGranted()) sendNotification({ title, body });
  },

  setStatus(status) {
    invoke("update_tray", { status }).catch(console.error);
  },

  setLabels(labels) {
    invoke("set_labels", { labels }).catch(console.error);
  },

  onAction(handler) {
    listen<DesktopAction>("desktop-action", (event) => handler(event.payload)).catch(
      console.error,
    );
  },

  onBackground(handler) {
    const main = getCurrentWindow();
    main.onFocusChanged(({ payload: focused }) => handler(!focused)).catch(console.error);
    // Al mostrarla a propósito ya se ha vuelto, aunque el sistema no le dé el foco.
    listen("main-shown", () => handler(false)).catch(console.error);
    main
      .isFocused()
      .then((focused) => handler(!focused))
      .catch(console.error);
  },

  setFloat(view) {
    invoke("update_float", { view }).catch(console.error);
  },

  floatProblem() {
    return invoke<FloatProblem | null>("float_problem");
  },

  async setGlobalShortcut(enabled) {
    try {
      await invoke("set_global_shortcut", { enabled });
      return null;
    } catch (error) {
      // Rust solo rechaza con uno de esos códigos.
      return error as ShortcutProblem;
    }
  },
};
