import { defineStore } from "pinia";
import { computed, ref, shallowRef, watch } from "vue";
import { now } from "../core/clock";
import { floatView } from "../core/float";
import { clock, duration, startOfDay, toMinutes } from "../core/format";
import * as goals from "../core/session";
import { pomodorosToday } from "../core/stats";
import * as engine from "../core/timer";
import type { FocusState, Goal, Phase, Session } from "../core/types";
import { repo } from "../data";
import { locale, m } from "../i18n";
import { platform } from "../platform";
import { playChime, unlockChime } from "../platform/chime";
import { startTicker } from "../platform/ticker";
import { useHistoryStore } from "./history";
import { useSettingsStore } from "./settings";

/** Espera antes de dar por hecho que el usuario se fue: los menús y las
    notificaciones también quitan el foco un momento. */
const LEAVE_MS = 400;

/** Reloj y sesión en curso. Toda transición pasa por `commit`, que la guarda. */
export const useFocusStore = defineStore("focus", () => {
  const settings = useSettingsStore();
  const history = useHistoryStore();

  const state = shallowRef<FocusState>(engine.initialState(settings.values));
  const nowTs = ref(now());
  const background = ref(false);
  /** Fase recién terminada, mientras la siguiente espera al usuario. */
  const finished = shallowRef<Phase | null>(null);

  const timer = computed(() => state.value.timer);
  const session = computed(() => state.value.session);
  const remainingMs = computed(() => engine.remainingAt(timer.value, nowTs.value));
  const isBreak = computed(() => timer.value.phase !== "focus");
  const running = computed(() => timer.value.status === "running");
  const celebrating = computed(() => engine.isCelebrating(state.value));
  const inProgress = computed(
    () => session.value.status === "active" && session.value.startedAt !== null,
  );
  const toggleLabel = computed(() => m.value.toggle[timer.value.status]);
  const skipLabel = computed(() => m.value.skip[isBreak.value ? "break" : "focus"]);
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
  let lastFloat = "null";
  let leaving: ReturnType<typeof setTimeout> | undefined;

  function push() {
    pushStatus();
    pushFloat();
  }

  function pushFloat() {
    const next = floatView(state.value, settings.values, {
      background: background.value,
      remainingMs: remainingMs.value,
      finished: finished.value,
      lang: locale.value,
    });
    const key = JSON.stringify(next);
    if (key === lastFloat) return;
    lastFloat = key;
    platform().setFloat(next);
  }

  function setBackground(away: boolean) {
    clearTimeout(leaving);
    if (away) {
      leaving = setTimeout(() => {
        background.value = true;
        push();
      }, LEAVE_MS);
    } else {
      background.value = false;
      push();
    }
  }

  function pushStatus() {
    const { phase, status } = timer.value;
    const text =
      status === "idle" ? "" : `${clock(remainingMs.value)} · ${m.value.phase[phase]}`;
    const next = {
      text,
      toggleLabel: toggleLabel.value,
      skipLabel: skipLabel.value,
      canSkip: canSkip.value && !celebrating.value,
      floatOn: settings.values.float,
    };
    const key = JSON.stringify(next);
    if (key === lastStatus) return;
    lastStatus = key;
    platform().setStatus(next);
  }

  function commit(next: FocusState) {
    state.value = next;
    nowTs.value = now();
    if (next.timer.status !== "idle") finished.value = null;
    push();
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
    else push();
  }

  function completePhase(natural: boolean) {
    const result = engine.finish(state.value, settings.values, now());
    if (!result.finished) return;
    finished.value = result.finished;
    commit(result.state);
    if (result.archived) history.save(result.archived);
    if (natural) announce(result);
  }

  function announce({ finished, archived, state: next }: engine.FinishResult) {
    if (settings.values.sound) playChime();
    if (!settings.values.notify) return;
    const text = m.value.notification;
    let title: string;
    let body: string;
    if (archived) {
      title = m.value.complete;
      body = m.value.summary(archived.done, toMinutes(goals.focusMs(archived)));
    } else if (finished === "focus") {
      title = text.focusTitle;
      body = text.focusBody(duration(settings.values.short));
    } else {
      title = text.breakTitle;
      body = text.breakBody(next.session.done + 1, next.session.rounds);
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
    // La bandeja y la ventana flotante no son de Vue: al cambiar de idioma se les
    // envía el texto otra vez.
    watch(
      m,
      () => {
        platform().setLabels(m.value.tray);
        push();
      },
      { immediate: true },
    );
    platform().onBackground(setBackground);
    platform().onAction((action) => {
      if (action === "toggle") toggle();
      else if (action === "skip") skip();
      else void toggleFloat();
    });
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

  async function toggleFloat() {
    await settings.save({ ...settings.values, float: !settings.values.float });
    push();
  }

  function skip() {
    if (canSkip.value && !celebrating.value) completePhase(false);
  }

  function reset() {
    finished.value = null;
    commit(engine.reset(state.value, settings.values));
  }

  function pickPhase(phase: Phase) {
    finished.value = null;
    commit(engine.pickPhase(state.value, phase, settings.values));
  }

  function endSession() {
    finished.value = null;
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
