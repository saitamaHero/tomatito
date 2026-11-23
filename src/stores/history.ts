import { defineStore } from "pinia";
import { shallowRef } from "vue";
import type { Session } from "../core/types";
import { repo } from "../data";

/** Sesiones cerradas. */
export const useHistoryStore = defineStore("history", () => {
  const sessions = shallowRef<Session[]>([]);

  async function load() {
    sessions.value = await repo().listSessions();
  }

  function save(session: Session) {
    sessions.value = [...sessions.value.filter((s) => s.id !== session.id), session];
    repo().saveSession(session).catch(console.error);
  }

  return { sessions, load, save };
});
