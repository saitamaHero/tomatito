import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import type { DesktopAction, Platform } from "./types";

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

  onAction(handler) {
    listen<DesktopAction>("desktop-action", (event) => handler(event.payload)).catch(
      console.error,
    );
  },

  async setGlobalShortcut(enabled) {
    try {
      await invoke("set_global_shortcut", { enabled });
      return null;
    } catch (error) {
      return String(error);
    }
  },
};
