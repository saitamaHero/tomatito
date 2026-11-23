import { creditGoal, emptySession, firstPending, lastActivity, nextSession } from "./session";
import { phaseMs } from "./settings";
import { startOfDay } from "./format";
import type { FocusState, Phase, Session, Settings, TimerState } from "./types";

/** Con un retraso mayor (equipo suspendido) no se arranca sola la fase siguiente. */
export const LATE_MS = 60_000;

export interface FinishResult {
  state: FocusState;
  /** null si no había nada que terminar. */
  finished: Phase | null;
  /** Sesión recién cerrada, lista para archivar. */
  archived: Session | null;
}

export function idleTimer(phase: Phase, settings: Settings): TimerState {
  const totalMs = phaseMs(phase, settings);
  return {
    phase,
    status: "idle",
    totalMs,
    remainingMs: totalMs,
    endsAt: null,
    startedAt: null,
    goalId: null,
  };
}

export function initialState(settings: Settings): FocusState {
  return { timer: idleTimer("focus", settings), session: emptySession(settings) };
}

export function remainingAt(timer: TimerState, now: number): number {
  if (timer.status !== "running" || timer.endsAt === null) return timer.remainingMs;
  return Math.min(timer.totalMs, Math.max(0, timer.endsAt - now));
}

export function hasProgress(timer: TimerState): boolean {
  return timer.status !== "idle";
}

export function isDue(timer: TimerState, now: number): boolean {
  return timer.status === "running" && timer.endsAt !== null && now >= timer.endsAt;
}

/** Ciclo terminado, a la espera de que el usuario decida qué sigue. */
export function isCelebrating({ timer, session }: FocusState): boolean {
  return session.status === "completed" && timer.phase === "long" && timer.status === "idle";
}

export function start(state: FocusState, settings: Settings, now: number): FocusState {
  const { timer } = state;
  if (timer.status === "running") return state;

  let session = state.session;
  if (timer.phase === "focus") {
    if (session.status !== "active") session = nextSession(session, settings);
    if (session.startedAt === null) {
      session = { ...session, startedAt: now, rounds: settings.rounds };
    }
  }

  return {
    session,
    timer: {
      ...timer,
      status: "running",
      endsAt: now + timer.remainingMs,
      startedAt: timer.startedAt ?? now,
      goalId:
        timer.phase === "focus" && timer.status === "idle"
          ? (firstPending(session)?.id ?? null)
          : timer.goalId,
    },
  };
}

export function pause(state: FocusState, now: number): FocusState {
  const { timer, session } = state;
  if (timer.status !== "running") return state;
  return {
    session: timer.phase === "focus" ? { ...session, pauses: session.pauses + 1 } : session,
    timer: { ...timer, status: "paused", remainingMs: remainingAt(timer, now), endsAt: null },
  };
}

/** Vuelve al principio de la fase sin contarla. */
export function reset(state: FocusState, settings: Settings): FocusState {
  return { ...state, timer: idleTimer(state.timer.phase, settings) };
}

/** Cambia de fase a mano, descartando la que estuviera en curso. */
export function pickPhase(state: FocusState, phase: Phase, settings: Settings): FocusState {
  const session =
    phase === "focus" && state.session.status !== "active"
      ? nextSession(state.session, settings)
      : state.session;
  return { session, timer: idleTimer(phase, settings) };
}

/** Termina la fase, porque llegó a cero o porque el usuario la saltó. */
export function finish(state: FocusState, settings: Settings, now: number): FinishResult {
  const { timer } = state;
  let { session } = state;

  // Un pomodoro sin empezar no se puede terminar: contaría uno de cero minutos.
  if (timer.phase === "focus" && timer.status === "idle") {
    return { state, finished: null, archived: null };
  }

  const endedAt =
    timer.status === "running" && timer.endsAt !== null ? Math.min(now, timer.endsAt) : now;
  const late = now - endedAt > LATE_MS;
  const activeMs = timer.totalMs - remainingAt(timer, endedAt);
  const inSession = session.status === "active" && session.startedAt !== null;

  if (inSession && timer.startedAt !== null && activeMs > 0) {
    session = {
      ...session,
      segments: [
        ...session.segments,
        {
          kind: timer.phase === "focus" ? "focus" : "break",
          startedAt: timer.startedAt,
          endedAt,
          activeMs,
        },
      ],
    };
  }

  if (timer.phase === "focus") {
    session = creditGoal({ ...session, done: session.done + 1 }, timer.goalId);

    if (session.done >= session.rounds) {
      session = { ...session, status: "completed", endedAt };
      return {
        state: { session, timer: idleTimer("long", settings) },
        finished: "focus",
        archived: session,
      };
    }
    const next: FocusState = { session, timer: idleTimer("short", settings) };
    return {
      state: settings.autoBreak && !late ? start(next, settings, now) : next,
      finished: "focus",
      archived: null,
    };
  }

  if (session.status !== "active") session = nextSession(session, settings);
  const next: FocusState = { session, timer: idleTimer("focus", settings) };
  return {
    state: settings.autoFocus && !late ? start(next, settings, now) : next,
    finished: timer.phase,
    archived: null,
  };
}

/** Cierra la sesión actual. Sin pomodoros no hay nada que archivar. */
export function closeSession(
  state: FocusState,
  settings: Settings,
): { state: FocusState; archived: Session | null } {
  const { session } = state;
  const archived: Session | null =
    session.status === "active" && session.startedAt !== null && session.done > 0
      ? { ...session, status: "ended", endedAt: lastActivity(session) }
      : null;
  return {
    state: { session: nextSession(session, settings), timer: idleTimer("focus", settings) },
    archived,
  };
}

/** Si la fase acabó con la app cerrada, vuelve a cero sin contar. */
export function restore(state: FocusState, settings: Settings, now: number): FocusState {
  return isDue(state.timer, now) ? reset(state, settings) : state;
}

/** La sesión es de otro día y el reloj no está corriendo. */
export function needsRollover({ timer, session }: FocusState, now: number): boolean {
  if (timer.status === "running" || session.startedAt === null) return false;
  const last = Math.max(lastActivity(session) ?? 0, timer.startedAt ?? 0);
  return startOfDay(last) < startOfDay(now);
}

/** Lleva los ajustes recién guardados a lo que aún no ha empezado. */
export function applySettings(state: FocusState, settings: Settings): FocusState {
  return {
    timer:
      state.timer.status === "idle" ? idleTimer(state.timer.phase, settings) : state.timer,
    session:
      state.session.startedAt === null
        ? { ...state.session, rounds: settings.rounds }
        : state.session,
  };
}
