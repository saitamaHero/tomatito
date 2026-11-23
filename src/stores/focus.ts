import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";
import { now } from "../core/clock";
import { clock, duration, PHASE_LABEL, plural, startOfDay, toMinutes } from "../core/format";
import * as goals from "../core/session";
import { pomodorosToday } from "../core/stats";
import * as engine from "../core/timer";
import type { FocusState, Goal, Phase, Session } from "../core/types";
import { repo } from "../data";
import { platform } from "../platform";
import { playChime, unlockChime } from "../platform/chime";
import { startTicker } from "../platform/ticker";
import { useHistoryStore } from "./history";
import { useSettingsStore } from "./settings";

/** Reloj y sesión en curso. Toda transición pasa por `commit`, que la guarda. */
export const useFocusStore = defineStore("focus", () => {
  const settings = useSettingsStore();
  const history = useHistoryStore();

  const state = shallowRef<FocusState>(engine.initialState(settings.values));
  const nowTs = ref(now());

  const timer = computed(() => state.value.timer);
  const session = computed(() => state.value.session);
  const remainingMs = computed(() => engine.remainingAt(timer.value, nowTs.value));
  const isBreak = computed(() => timer.value.phase !== "focus");
  const running = computed(() => timer.value.status === "running");
  const celebrating = computed(() => engine.isCelebrating(state.value));
  const inProgress = computed(
    () => session.value.status === "active" && session.value.startedAt !== null,
  );
  const toggleLabel = computed(
    () => ({ idle: "Empezar", running: "Pausar", paused: "Seguir" })[timer.value.status],
  );
  const skipLabel = computed(() => (isBreak.value ? "Saltar descanso" : "Terminar pomodoro"));
  const canSkip = computed(() => isBreak.value || timer.value.status !== "idle");
  const allSessions = computed<Session[]>(() =>
    inProgress.value && session.value.done > 0
      ? [...history.sessions, session.value]
      : history.sessions,
  );
  // Pasa por el día para no recorrer el historial en cada tick.
  const day = computed(() => startOfDay(nowTs.value));
  const today = computed(() => pomodorosToday(allSessions.value, day.value));

  let lastStatus = "";

  function pushStatus() {
    const { phase, status } = timer.value;
    const text =
      status === "idle" ? "" : `${clock(remainingMs.value)} · ${PHASE_LABEL[phase]}`;
    const next = {
      text,
      toggleLabel: toggleLabel.value,
      skipLabel: skipLabel.value,
      canSkip: canSkip.value && !celebrating.value,
    };
    const key = JSON.stringify(next);
    if (key === lastStatus) return;
    lastStatus = key;
    platform().setStatus(next);
  }

  function commit(next: FocusState) {
    state.value = next;
    nowTs.value = now();
    pushStatus();
    repo().saveCurrent(next).catch(console.error);
  }

  function commitSession(next: Session) {
    commit({ ...state.value, session: next });
    // Un ciclo completo ya está archivado: los objetivos marcados después también cuentan.
    if (next.status === "completed") history.save(next);
  }

  function rollover() {
    if (engine.needsRollover(state.value, now())) endSession();
  }

  function tick() {
    nowTs.value = now();
    if (engine.isDue(timer.value, nowTs.value)) completePhase(true);
    else pushStatus();
  }

  function completePhase(natural: boolean) {
    const result = engine.finish(state.value, settings.values, now());
    if (!result.finished) return;
    commit(result.state);
    if (result.archived) history.save(result.archived);
    if (natural) announce(result);
  }

  function announce({ finished, archived, state: next }: engine.FinishResult) {
    if (settings.values.sound) playChime();
    if (!settings.values.notify) return;
    let title: string;
    let body: string;
    if (archived) {
      title = "¡Tomatito completo!";
      body = `${plural(archived.done, "pomodoro", "pomodoros")} · ${toMinutes(goals.focusMs(archived))} min de enfoque`;
    } else if (finished === "focus") {
      title = "Pomodoro terminado";
      body = `Toca descanso corto de ${duration(settings.values.short)}.`;
    } else {
      title = "Descanso terminado";
      body = `Sigue el pomodoro ${next.session.done + 1} de ${next.session.rounds}.`;
    }
    platform().notify(title, body).catch(console.error);
  }

  async function load() {
    const stored = await repo().loadCurrent();
    const restored = stored
      ? engine.restore(stored, settings.values, now())
      : engine.initialState(settings.values);
    commit(engine.applySettings(restored, settings.values));
    rollover();

    startTicker(tick);
    window.addEventListener("focus", rollover);
    platform().onAction((action) => (action === "toggle" ? toggle() : skip()));
  }

  function toggle() {
    if (running.value) {
      commit(engine.pause(state.value, now()));
      return;
    }
    unlockChime();
    if (settings.values.notify) platform().prepareNotifications().catch(console.error);
    rollover();
    commit(engine.start(state.value, settings.values, now()));
  }

  function skip() {
    if (canSkip.value && !celebrating.value) completePhase(false);
  }

  function reset() {
    commit(engine.reset(state.value, settings.values));
  }

  function pickPhase(phase: Phase) {
    commit(engine.pickPhase(state.value, phase, settings.values));
  }

  function endSession() {
    const { state: next, archived } = engine.closeSession(state.value, settings.values);
    if (archived) history.save(archived);
    commit(next);
  }

  function repeat(past: Session) {
    endSession();
    commit({
      timer: engine.idleTimer("focus", settings.values),
      session: goals.repeatSession(past, settings.values),
    });
  }

  function settingsChanged() {
    commit(engine.applySettings(state.value, settings.values));
  }

  const addGoal = (text: string) => commitSession(goals.addGoal(session.value, text));
  const removeGoal = (id: string) => commitSession(goals.removeGoal(session.value, id));
  const updateGoal = (id: string, patch: Partial<Goal>) =>
    commitSession(goals.updateGoal(session.value, id, patch));

  return {
    timer,
    session,
    nowTs,
    remainingMs,
    isBreak,
    running,
    celebrating,
    inProgress,
    toggleLabel,
    skipLabel,
    canSkip,
    allSessions,
    today,
    load,
    toggle,
    skip,
    reset,
    pickPhase,
    endSession,
    repeat,
    settingsChanged,
    addGoal,
    removeGoal,
    updateGoal,
  };
});
