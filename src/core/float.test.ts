import { describe, expect, it } from "vitest";
import { floatView, type FloatContext } from "./float";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";
import { finish, initialState, pause, pickPhase, remainingAt, start } from "./timer";
import type { FocusState, Phase, Settings } from "./types";

const MIN = 60_000;
const T0 = new Date(2026, 10, 23, 9, 5).getTime();
const base: Settings = { ...DEFAULT_SETTINGS, autoBreak: false, autoFocus: false };

const idle = initialState(base);
const running = start(idle, base, T0);
const paused = pause(running, T0 + 10 * MIN);
const onBreak = start(pickPhase(idle, "short", base), base, T0);
const breakPaused = pause(onBreak, T0 + MIN);

function view(
  state: FocusState,
  settings: Partial<Settings> = {},
  context: Partial<FloatContext> = {},
  now = T0 + 10 * MIN,
) {
  return floatView(
    state,
    { ...base, ...settings },
    {
      background: true,
      finished: null,
      remainingMs: remainingAt(state.timer, now),
      ...context,
    },
  );
}

/** Termina fases hasta completar `count`, alternando enfoque y descanso. */
function after(count: number, settings: Settings = base) {
  let state = initialState(settings);
  let finished: Phase | null = null;
  let now = T0;
  for (let i = 0; i < count; i++) {
    state = start(state, settings, now);
    now = state.timer.endsAt!;
    const result = finish(state, settings, now);
    state = result.state;
    finished = result.finished;
  }
  return { state, finished };
}

describe("cuándo se ve", () => {
  it.each<[string, FocusState, boolean, boolean, boolean]>([
    // estado, siempre, solo en enfoque, solo si corre
    ["en reposo", idle, false, false, false],
    ["enfoque corriendo", running, true, true, true],
    ["enfoque en pausa", paused, true, true, false],
    ["descanso corriendo", onBreak, true, false, true],
    ["descanso en pausa", breakPaused, true, false, false],
  ])("%s", (_name, state, always, focus, whenRunning) => {
    expect(view(state, { floatWhen: "always" }) !== null).toBe(always);
    expect(view(state, { floatWhen: "focus" }) !== null).toBe(focus);
    expect(view(state, { floatWhen: "running" }) !== null).toBe(whenRunning);
  });

  it("nunca con Tomatito delante", () => {
    expect(view(running, {}, { background: false })).toBeNull();
    const { state, finished } = after(1);
    expect(view(state, {}, { background: false, finished })).toBeNull();
  });

  it("nunca si está desactivada", () => {
    expect(view(running, { float: false })).toBeNull();
    const { state, finished } = after(1);
    expect(view(state, { float: false }, { finished })).toBeNull();
  });
});

describe("el tiempo", () => {
  it("enfoque", () => {
    expect(view(running)).toEqual({
      kind: "timer",
      tone: "focus",
      label: "ENFOQUE",
      time: "15:00",
      progress: 0.4,
      running: true,
      toggleLabel: "Pausar",
      done: 0,
      rounds: 4,
      compact: false,
    });
  });

  it("en pausa conserva el tiempo, también en un descanso", () => {
    expect(view(paused, {}, {}, T0 + 20 * MIN)).toMatchObject({
      tone: "paused",
      label: "EN PAUSA",
      time: "15:00",
      running: false,
      toggleLabel: "Seguir",
    });
    expect(view(breakPaused)).toMatchObject({ tone: "paused", label: "EN PAUSA", time: "04:00" });
  });

  it("descanso", () => {
    expect(view(onBreak, {}, {}, T0 + 108_000)).toMatchObject({
      tone: "break",
      label: "DESCANSO",
      time: "03:12",
    });
  });

  it("no cambia entre un segundo y el siguiente", () => {
    const at = (ms: number) => view(running, {}, {}, T0 + ms);
    expect(at(1_100)).toEqual(at(1_900));
    expect(at(1_900)).not.toEqual(at(2_100));
  });

  it("compacta por ajuste", () => {
    expect(view(running, { floatSize: "compact" })).toMatchObject({ compact: true });
  });
});

describe("fin de fase", () => {
  it("pomodoro", () => {
    const { state, finished } = after(5);
    expect(view(state, {}, { finished })).toEqual({
      kind: "finished",
      tone: "break",
      title: "Pomodoro 3 terminado",
      body: "Toca para descansar 5 min",
      action: "Descansar",
    });
  });

  it("descanso", () => {
    const { state, finished } = after(6);
    expect(view(state, {}, { finished })).toEqual({
      kind: "finished",
      tone: "focus",
      title: "Descanso terminado",
      body: "Toca para el pomodoro 4 de 4",
      action: "Empezar",
    });
  });

  it("ciclo completo y descanso largo", () => {
    const complete = after(7);
    expect(view(complete.state, {}, { finished: complete.finished })).toMatchObject({
      tone: "break",
      title: "¡Tomatito completo!",
      body: "Toca para descansar 15 min",
    });
    const rested = after(8);
    expect(view(rested.state, {}, { finished: rested.finished })).toMatchObject({
      title: "Descanso terminado",
      body: "Toca para una sesión nueva",
    });
  });

  it("no sale si la fase siguiente arranca sola", () => {
    const auto = { ...base, autoBreak: true };
    const { state, finished } = after(1, auto);
    const now = state.timer.startedAt!;
    expect(view(state, auto, { finished }, now)).toMatchObject({
      kind: "timer",
      label: "DESCANSO",
    });
  });

  it("sale en los tres modos, salvo el fin de un descanso en «Solo en enfoque»", () => {
    const focus = after(1);
    const rest = after(2);
    for (const floatWhen of ["always", "focus", "running"] as const) {
      expect(view(focus.state, { floatWhen }, { finished: focus.finished })).not.toBeNull();
      expect(view(rest.state, { floatWhen }, { finished: rest.finished }) !== null).toBe(
        floatWhen !== "focus",
      );
    }
  });

  it("se ve grande aunque el tamaño sea compacto", () => {
    const { state, finished } = after(1);
    expect(view(state, { floatSize: "compact" }, { finished })).toMatchObject({
      kind: "finished",
    });
  });
});

describe("ajustes guardados", () => {
  it("una versión anterior recibe los valores por defecto", () => {
    expect(normalizeSettings({ focus: 50 })).toMatchObject({
      float: true,
      floatWhen: "always",
      floatSize: "normal",
    });
  });

  it("descarta valores desconocidos", () => {
    const stored = { floatWhen: "a veces", floatSize: "enorme" } as unknown as Settings;
    expect(normalizeSettings(stored)).toMatchObject({
      floatWhen: "always",
      floatSize: "normal",
    });
  });

  it("respeta los válidos", () => {
    const stored: Partial<Settings> = {
      float: false,
      floatWhen: "running",
      floatSize: "compact",
    };
    expect(normalizeSettings(stored)).toMatchObject(stored);
  });
});
