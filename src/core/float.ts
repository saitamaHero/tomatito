import { clock, duration, TOGGLE_LABEL, toMinutes } from "./format";
import { isCelebrating } from "./timer";
import type { FocusState, Phase, Settings } from "./types";

/** Lo que pinta la ventana flotante. Solo datos: viaja a otra ventana. */
export type FloatView = FloatTimer | FloatFinished;

export interface FloatTimer {
  kind: "timer";
  tone: "focus" | "paused" | "break";
  label: string;
  time: string;
  /** De 0 a 1. */
  progress: number;
  running: boolean;
  toggleLabel: string;
  done: number;
  rounds: number;
  compact: boolean;
}

/** La fase acabó y la siguiente espera al usuario. */
export interface FloatFinished {
  kind: "finished";
  tone: "focus" | "break";
  title: string;
  body: string;
  action: string;
}

export interface FloatContext {
  /** El usuario está en otra app. */
  background: boolean;
  remainingMs: number;
  /** Fase recién terminada, si la siguiente no ha empezado. */
  finished: Phase | null;
}

/** null: la ventana flotante no debe verse. */
export function floatView(
  state: FocusState,
  settings: Settings,
  { background, remainingMs, finished }: FloatContext,
): FloatView | null {
  if (!settings.float || !background) return null;
  const { timer, session } = state;

  if (timer.status === "idle") {
    if (finished === null) return null;
    if (settings.floatWhen === "focus" && finished !== "focus") return null;
    return finishedView(state, finished);
  }

  if (settings.floatWhen === "focus" && timer.phase !== "focus") return null;
  if (settings.floatWhen === "running" && timer.status !== "running") return null;

  const paused = timer.status === "paused";
  const isBreak = timer.phase !== "focus";
  return {
    kind: "timer",
    tone: paused ? "paused" : isBreak ? "break" : "focus",
    label: paused ? "EN PAUSA" : isBreak ? "DESCANSO" : "ENFOQUE",
    time: clock(remainingMs),
    // En segundos enteros, como el tiempo: no hay nada que enviar entre uno y otro.
    progress: 1 - Math.min(1, (Math.ceil(remainingMs / 1000) * 1000) / timer.totalMs),
    running: timer.status === "running",
    toggleLabel: TOGGLE_LABEL[timer.status],
    done: session.done,
    rounds: session.rounds,
    compact: settings.floatSize === "compact",
  };
}

function finishedView(state: FocusState, finished: Phase): FloatFinished {
  const { timer, session } = state;
  const next = duration(toMinutes(timer.totalMs));

  if (finished === "focus") {
    return {
      kind: "finished",
      tone: "break",
      title: isCelebrating(state)
        ? "¡Tomatito completo!"
        : `Pomodoro ${session.done} terminado`,
      body: `Toca para descansar ${next}`,
      action: "Descansar",
    };
  }
  return {
    kind: "finished",
    tone: "focus",
    title: "Descanso terminado",
    body:
      session.done > 0
        ? `Toca para el pomodoro ${session.done + 1} de ${session.rounds}`
        : "Toca para una sesión nueva",
    action: "Empezar",
  };
}
