export type Phase = "focus" | "short" | "long";

export interface Settings {
  /** Minutos. */
  focus: number;
  short: number;
  long: number;
  /** Pomodoros por ciclo. */
  rounds: number;
  /** Pomodoros al día. */
  dailyGoal: number;
  autoBreak: boolean;
  autoFocus: boolean;
  sound: boolean;
  notify: boolean;
  /** Solo se usa en desktop. */
  globalShortcut: boolean;
}

export interface Goal {
  id: string;
  text: string;
  est: number;
  spent: number;
  done: boolean;
}

/** Tramo terminado dentro de una sesión. */
export interface Segment {
  kind: "focus" | "break";
  startedAt: number;
  endedAt: number;
  /** Tiempo real contado, sin pausas. */
  activeMs: number;
}

export interface Session {
  id: string;
  /** null mientras no se ha empezado el primer pomodoro. */
  startedAt: number | null;
  endedAt: number | null;
  status: "active" | "completed" | "ended";
  rounds: number;
  done: number;
  pauses: number;
  goals: Goal[];
  segments: Segment[];
}

export interface TimerState {
  phase: Phase;
  status: "idle" | "running" | "paused";
  totalMs: number;
  /** Válido cuando no está corriendo; corriendo manda `endsAt`. */
  remainingMs: number;
  endsAt: number | null;
  startedAt: number | null;
  /** Objetivo al que se apuntará el pomodoro en curso. */
  goalId: string | null;
}

export interface FocusState {
  timer: TimerState;
  session: Session;
}
