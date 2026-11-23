import { describe, expect, it } from "vitest";
import { addGoal, updateGoal } from "./session";
import { DEFAULT_SETTINGS } from "./settings";
import {
  applySettings,
  closeSession,
  finish,
  initialState,
  isCelebrating,
  needsRollover,
  pause,
  pickPhase,
  remainingAt,
  reset,
  restore,
  start,
} from "./timer";
import type { FocusState, Settings } from "./types";

const MIN = 60_000;
const T0 = new Date(2026, 10, 23, 9, 5).getTime();
const manual: Settings = { ...DEFAULT_SETTINGS, autoBreak: false, autoFocus: false };

function withGoals(...texts: string[]): FocusState {
  const state = initialState(manual);
  return { ...state, session: texts.reduce(addGoal, state.session) };
}

/** Corre la fase actual hasta el final y devuelve el estado y la hora. */
function run(state: FocusState, settings: Settings, now: number) {
  const started = start(state, settings, now);
  const end = started.timer.endsAt!;
  return { ...finish(started, settings, end), now: end };
}

function cycle(settings: Settings, initial: FocusState = initialState(settings)) {
  let state = initial;
  let now = T0;
  for (let i = 0; i < settings.rounds; i++) {
    const focus = run(state, settings, now);
    ({ state, now } = focus);
    if (focus.archived) return { state, now, archived: focus.archived };
    ({ state, now } = run(state, settings, now));
  }
  throw new Error("el ciclo no se cerró");
}

describe("ciclo", () => {
  it.each([3, 4])("se completa con %i rondas", (rounds) => {
    const { state, archived, now } = cycle({ ...manual, rounds });
    expect(archived.status).toBe("completed");
    expect(archived.done).toBe(rounds);
    expect(archived.endedAt).toBe(now);
    expect(archived.segments.filter((s) => s.kind === "focus")).toHaveLength(rounds);
    expect(archived.segments.filter((s) => s.kind === "break")).toHaveLength(rounds - 1);
    expect(isCelebrating(state)).toBe(true);
  });

  it("espera al usuario al completarse aunque el descanso sea automático", () => {
    const { state } = cycle({ ...manual, autoBreak: true, autoFocus: true, rounds: 2 });
    expect(state.timer).toMatchObject({ phase: "long", status: "idle" });
  });

  it("el descanso largo queda fuera de la sesión y abre una nueva", () => {
    const { state, archived, now } = cycle(manual);
    const after = run(state, manual, now).state;
    expect(after.session.id).not.toBe(archived.id);
    expect(after.session).toMatchObject({ status: "active", startedAt: null, done: 0 });
    expect(after.session.segments).toEqual([]);
    expect(after.timer.phase).toBe("focus");
  });

  it("encadena fases según los ajustes", () => {
    const auto = { ...manual, autoBreak: true, autoFocus: true };
    const afterFocus = run(initialState(auto), auto, T0);
    expect(afterFocus.state.timer).toMatchObject({ phase: "short", status: "running" });
    const afterBreak = finish(afterFocus.state, auto, afterFocus.state.timer.endsAt!);
    expect(afterBreak.state.timer).toMatchObject({ phase: "focus", status: "running" });
  });

  it("un descanso largo elegido a mano no borra el progreso", () => {
    const { state, now } = run(initialState(manual), manual, T0);
    const after = run(pickPhase(state, "long", manual), manual, now).state;
    expect(after.session.done).toBe(1);
    expect(after.session.id).toBe(state.session.id);
  });
});

describe("pausa, reinicio y salto", () => {
  it("conserva lo que falta y cuenta la pausa", () => {
    const paused = pause(start(initialState(manual), manual, T0), T0 + 10 * MIN);
    expect(paused.timer.remainingMs).toBe(15 * MIN);
    expect(paused.session.pauses).toBe(1);
    const resumed = start(paused, manual, T0 + 60 * MIN);
    expect(resumed.timer.endsAt).toBe(T0 + 75 * MIN);
    expect(remainingAt(resumed.timer, T0 + 65 * MIN)).toBe(10 * MIN);
  });

  it("no cuenta como pausa la del descanso", () => {
    const { state, now } = run(initialState(manual), manual, T0);
    const paused = pause(start(state, manual, now), now + MIN);
    expect(paused.session.pauses).toBe(0);
  });

  it("reiniciar descarta la fase sin contarla", () => {
    const state = reset(start(initialState(manual), manual, T0), manual);
    expect(state.timer).toMatchObject({ status: "idle", remainingMs: 25 * MIN });
    expect(state.session.done).toBe(0);
  });

  it("terminar antes cuenta el pomodoro con sus minutos reales", () => {
    const paused = pause(start(initialState(manual), manual, T0), T0 + 10 * MIN);
    const { state } = finish(paused, manual, T0 + 30 * MIN);
    expect(state.session.done).toBe(1);
    expect(state.session.segments[0].activeMs).toBe(10 * MIN);
  });

  it("no se puede terminar un pomodoro sin empezar", () => {
    const state = initialState(manual);
    expect(finish(state, manual, T0)).toEqual({ state, finished: null, archived: null });
  });

  it("saltar un descanso sin empezar no deja tramo", () => {
    const { state, now } = run(initialState(manual), manual, T0);
    expect(finish(state, manual, now).state.session.segments).toHaveLength(1);
  });
});

describe("objetivos", () => {
  it("apunta el pomodoro al primero pendiente", () => {
    const { state } = run(withGoals("A", "B"), manual, T0);
    expect(state.session.goals.map((g) => g.spent)).toEqual([1, 0]);
  });

  it("lo apunta al que estaba activo aunque se cumpla a mitad", () => {
    const started = start(withGoals("A", "B"), manual, T0);
    const [a] = started.session.goals;
    const marked = { ...started, session: updateGoal(started.session, a.id, { done: true }) };
    const { state } = finish(marked, manual, started.timer.endsAt!);
    expect(state.session.goals.map((g) => g.spent)).toEqual([1, 0]);
  });

  it("si se borró, lo apunta al primero pendiente", () => {
    const started = start(withGoals("A", "B"), manual, T0);
    const without = {
      ...started,
      session: { ...started.session, goals: started.session.goals.slice(1) },
    };
    const { state } = finish(without, manual, started.timer.endsAt!);
    expect(state.session.goals).toMatchObject([{ text: "B", spent: 1 }]);
  });

  it("la sesión nueva arrastra los pendientes con lo que les falta", () => {
    let { session } = withGoals("A", "B");
    session = updateGoal(session, session.goals[0].id, { done: true });
    session = updateGoal(session, session.goals[1].id, { est: 3, spent: 1 });
    const { state } = closeSession({ ...initialState(manual), session }, manual);
    expect(state.session.goals).toMatchObject([{ text: "B", est: 2, spent: 0, done: false }]);
  });
});

describe("cierre y restauración", () => {
  it("cierra a medias con la hora del último tramo", () => {
    const { state, now } = run(initialState(manual), manual, T0);
    const { archived } = closeSession(start(state, manual, now), manual);
    expect(archived).toMatchObject({ status: "ended", done: 1, endedAt: now });
  });

  it("no archiva una sesión sin pomodoros", () => {
    const started = start(withGoals("A"), manual, T0);
    const { archived, state } = closeSession(started, manual);
    expect(archived).toBeNull();
    expect(state.session.goals).toMatchObject([{ text: "A" }]);
  });

  it("no archiva dos veces un ciclo completo", () => {
    expect(closeSession(cycle(manual).state, manual).archived).toBeNull();
  });

  it("al reabrir sigue si la fase no ha acabado y vuelve a cero si acabó", () => {
    const started = start(initialState(manual), manual, T0);
    expect(restore(started, manual, T0 + 24 * MIN)).toBe(started);
    const restored = restore(started, manual, T0 + 26 * MIN);
    expect(restored.timer).toMatchObject({ phase: "focus", status: "idle" });
    expect(restored.session.done).toBe(0);
  });

  it("cambia de día solo con la sesión empezada y el reloj parado", () => {
    const tomorrow = T0 + 24 * 60 * MIN;
    const started = start(initialState(manual), manual, T0);
    expect(needsRollover(started, tomorrow)).toBe(false);
    expect(needsRollover(pause(started, T0 + MIN), tomorrow)).toBe(true);
    expect(needsRollover(pause(started, T0 + MIN), T0 + 60 * MIN)).toBe(false);
    expect(needsRollover(initialState(manual), tomorrow)).toBe(false);
    expect(needsRollover(cycle(manual).state, tomorrow)).toBe(true);
  });

  it("tras suspender el equipo cuenta la fase pero no arranca la siguiente", () => {
    const auto = { ...manual, autoBreak: true };
    const started = start(initialState(auto), auto, T0);
    const { state } = finish(started, auto, T0 + 3 * 60 * MIN);
    expect(state.session.segments[0]).toMatchObject({
      endedAt: T0 + 25 * MIN,
      activeMs: 25 * MIN,
    });
    expect(state.timer).toMatchObject({ phase: "short", status: "idle" });
  });
});

describe("ajustes", () => {
  const deep = { ...manual, focus: 50, rounds: 3 };

  it("actualiza la fase y la sesión sin empezar", () => {
    const state = applySettings(initialState(manual), deep);
    expect(state.timer.totalMs).toBe(50 * MIN);
    expect(state.session.rounds).toBe(3);
  });

  it("respeta la fase en curso y las rondas de la sesión empezada", () => {
    const state = applySettings(start(initialState(manual), manual, T0), deep);
    expect(state.timer.totalMs).toBe(25 * MIN);
    expect(state.session.rounds).toBe(4);
  });
});
