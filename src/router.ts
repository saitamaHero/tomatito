import { createRouter, createWebHashHistory } from "vue-router";
import TimerView from "./views/TimerView.vue";
import HistoryView from "./views/HistoryView.vue";
import SettingsView from "./views/SettingsView.vue";

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", name: "timer", component: TimerView },
    { path: "/historial/:id?", name: "history", component: HistoryView },
    { path: "/ajustes", name: "settings", component: SettingsView },
    { path: "/:rest(.*)*", redirect: "/" },
  ],
});
