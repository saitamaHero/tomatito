import { clock, duration, toMinutes } from "./format";
import { MESSAGES, type Locale, type Messages } from "./i18n";
import { isCelebrating } from "./timer";
import type { FocusState, Phase, Settings } from "./types";

/** Lo que pinta la ventana flotante. Solo datos: viaja a otra ventana. */
export type FloatView = (FloatTimer | FloatFinished) & {
  /** La página flotante no conoce los ajustes. */
  lang: Locale;
};

interface FloatTimer {
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
interface FloatFinished {
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
  lang: Locale;
}

/** null: la ventana flotante no debe verse. */
export function floatView(
  state: FocusState,
  settings: Settings,
  { background, remainingMs, finished, lang }: FloatContext,
): FloatView | null {
  if (!settings.float || !background) return null;
  const { timer, session } = state;
  const m = MESSAGES[lang];

  if (timer.status === "idle") {
    if (finished === null) return null;
    if (settings.floatWhen === "focus" && finished !== "focus") return null;
    return { ...finishedView(state, finished, m), lang };
  }

  if (settings.floatWhen === "focus" && timer.phase !== "focus") return null;
  if (settings.floatWhen === "running" && timer.status !== "running") return null;

  const paused = timer.status === "paused";
  const isBreak = timer.phase !== "focus";
  return {
    kind: "timer",
    tone: paused ? "paused" : isBreak ? "break" : "focus",
    label: paused ? m.float.paused : isBreak ? m.float.break : m.float.focus,
    time: clock(remainingMs),
    // En segundos enteros, como el tiempo: no hay nada que enviar entre uno y otro.
    progress: 1 - Math.min(1, (Math.ceil(remainingMs / 1000) * 1000) / timer.totalMs),
    running: timer.status === "running",
    toggleLabel: m.toggle[timer.status],
    done: session.done,
    rounds: session.rounds,
    compact: settings.floatSize === "compact",
    lang,
  };
}

function finishedView(state: FocusState, finished: Phase, m: Messages): FloatFinished {
  const { timer, session } = state;
  const next = duration(toMinutes(timer.totalMs));

  if (finished === "focus") {
    return {
      kind: "finished",
      tone: "break",
      title: isCelebrating(state)
        ? m.complete
        : m.float.pomodoroDone(session.done),
      body: m.float.rest(next),
      action: m.float.restAction,
    };
  }
  return {
    kind: "finished",
    tone: "focus",
    title: m.float.breakDone,
    body:
      session.done > 0
        ? m.float.nextPomodoro(session.done + 1, session.rounds)
        : m.float.newSession,
    action: m.float.startAction,
  };
}
