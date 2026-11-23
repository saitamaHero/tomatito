import "@fontsource-variable/dm-sans/opsz.css";
import "@fontsource/dm-mono/300.css";
import "@fontsource/dm-mono/400.css";
import "./styles/tokens.css";
import "./styles/base.css";

import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import { resolveLocale } from "./core/i18n";
import { openRepository } from "./data";
import { m, setLocale } from "./i18n";
import { initPlatform } from "./platform";
import { router } from "./router";
import { useFocusStore } from "./stores/focus";
import { useHistoryStore } from "./stores/history";
import { useSettingsStore } from "./stores/settings";

const root = document.querySelector<HTMLElement>("#app")!;
const app = createApp(App).use(createPinia());

function showMessage(text: string) {
  const p = document.createElement("p");
  p.style.cssText = "height:100%;display:grid;place-items:center;text-align:center;padding:32px";
  p.textContent = text;
  root.replaceChildren(p);
}

function fail(error: unknown) {
  console.error(error);
  showMessage(m.value.boot.failed);
}

async function boot() {
  const settings = useSettingsStore();
  // Otra vez: si esta pestaña esperaba, la otra pudo cambiarlos.
  await settings.load();
  await useHistoryStore().load();
  await useFocusStore().load();

  root.replaceChildren();
  app.use(router).mount(root);

  // Si el sistema lo rechaza, Ajustes lo cuenta; la app arranca igual.
  if (settings.values.globalShortcut) void settings.applyShortcut(true);
}

const start = () => boot().catch(fail);

const forever = new Promise<never>(() => {});

/* Dos pestañas contarían el mismo pomodoro dos veces: solo la que tiene el
   candado arranca. La otra espera y toma el relevo cuando se cierra la primera. */
async function startAlone() {
  if (!navigator.locks) return start();
  return navigator.locks.request("tomatito", { ifAvailable: true }, async (lock) => {
    if (lock) {
      await start();
      return forever;
    }
    showMessage(m.value.boot.otherTab);
    void navigator.locks.request("tomatito", async () => {
      await start();
      return forever;
    });
  });
}

async function main() {
  // El del sistema, por si no se llega a leer el elegido en Ajustes.
  setLocale(resolveLocale("system", navigator.languages));
  await Promise.all([openRepository(), initPlatform()]);
  await useSettingsStore().load();
  await startAlone();
}

main().catch(fail);
