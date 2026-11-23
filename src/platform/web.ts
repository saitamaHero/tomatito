import type { Platform } from "./types";

export const platform: Platform = {
  kind: "web",

  async prepareNotifications() {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  },

  async notify(title, body) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const notification = new Notification(title, { body, icon: "/favicon.svg", tag: "tomatito" });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  },

  setStatus({ text }) {
    document.title = text ? `${text} · Tomatito` : "Tomatito";
  },

  setLabels() {},

  onAction() {},

  onBackground() {},

  setFloat() {},

  async floatProblem() {
    return null;
  },

  async setGlobalShortcut() {
    return null;
  },
};
