import "@fontsource-variable/dm-sans/opsz.css";
import "@fontsource/dm-mono/300.css";
import "@fontsource/dm-mono/400.css";
import "./styles/tokens.css";
import "./styles/base.css";

import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import { openRepository } from "./data";
import { initPlatform } from "./platform";
import { router } from "./router";
import { useFocusStore } from "./stores/focus";
import { useHistoryStore } from "./stores/history";
import { useSettingsStore } from "./stores/settings";

const root = document.querySelector<HTMLElement>("#app")!;

function showMessage(text: string) {
  const p = document.createElement("p");
  p.style.cssText = "height:100%;display:grid;place-items:center;text-align:center;padding:32px";
  p.textContent = text;
  root.replaceChildren(p);
}

async function boot() {
  await Promise.all([openRepository(), initPlatform()]);
  const app = createApp(App).use(createPinia());

  const settings = useSettingsStore();
  await settings.load();
  await useHistoryStore().load();
  await useFocusStore().load();

  root.replaceChildren();
  app.use(router).mount(root);

  // Si el sistema lo rechaza, Ajustes lo cuenta; la app arranca igual.
  if (settings.values.globalShortcut) void settings.applyShortcut(true);
}

function start() {
  return boot().catch((error) => {
    console.error(error);
    showMessage("No se pudo abrir Tomatito. Comprueba que el navegador permite guardar datos.");
  });
}

/* Dos pestañas contarían el mismo pomodoro dos veces: solo la que tiene el
   candado arranca. La otra espera y toma el relevo cuando se cierra la primera. */
const forever = new Promise<never>(() => {});

if (!navigator.locks) {
  void start();
} else {
  void navigator.locks.request("tomatito", { ifAvailable: true }, async (lock) => {
    if (lock) {
      await start();
      return forever;
    }
    showMessage("Tomatito ya está abierto en otra pestaña.");
    void navigator.locks.request("tomatito", async () => {
      await start();
      return forever;
    });
  });
}
