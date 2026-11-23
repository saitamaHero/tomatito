import type { Goal, Session, Settings } from "./types";

export const MAX_ESTIMATE = 8;

export function newId(): string {
  return crypto.randomUUID();
}

export function emptySession(settings: Settings, goals: Goal[] = []): Session {
  return {
    id: newId(),
    startedAt: null,
    endedAt: null,
    status: "active",
    rounds: settings.rounds,
    done: 0,
    pauses: 0,
    goals,
    segments: [],
  };
}

/** Sesión nueva con los objetivos que quedaron pendientes en la anterior. */
export function nextSession(previous: Session, settings: Settings): Session {
  const pending = previous.goals
    .filter((g) => !g.done)
    .map((g) => ({ ...g, id: newId(), est: Math.max(1, g.est - g.spent), spent: 0 }));
  return emptySession(settings, pending);
}

/** Sesión nueva con todos los objetivos de una pasada, sin cumplir. */
export function repeatSession(past: Session, settings: Settings): Session {
  return emptySession(
    settings,
    past.goals.map((g) => ({ ...g, id: newId(), spent: 0, done: false })),
  );
}

export function firstPending(session: Session): Goal | undefined {
  return session.goals.find((g) => !g.done);
}

export function creditGoal(session: Session, goalId: string | null): Session {
  const target = session.goals.find((g) => g.id === goalId) ?? firstPending(session);
  if (!target) return session;
  return {
    ...session,
    goals: session.goals.map((g) => (g.id === target.id ? { ...g, spent: g.spent + 1 } : g)),
  };
}

export function addGoal(session: Session, text: string): Session {
  const clean = text.trim();
  if (!clean) return session;
  const goal: Goal = { id: newId(), text: clean, est: 1, spent: 0, done: false };
  return { ...session, goals: [...session.goals, goal] };
}

export function updateGoal(session: Session, id: string, patch: Partial<Goal>): Session {
  return {
    ...session,
    goals: session.goals.map((g) => {
      if (g.id !== id) return g;
      const next = { ...g, ...patch, id: g.id };
      next.text = next.text.trim() || g.text;
      next.est = Math.min(MAX_ESTIMATE, Math.max(1, next.est));
      return next;
    }),
  };
}

export function removeGoal(session: Session, id: string): Session {
  return { ...session, goals: session.goals.filter((g) => g.id !== id) };
}

export function goalsDone(session: Session): number {
  return session.goals.filter((g) => g.done).length;
}

export function focusMs(session: Session): number {
  return sumMs(session, "focus");
}

export function breakMs(session: Session): number {
  return sumMs(session, "break");
}

function sumMs(session: Session, kind: "focus" | "break"): number {
  return session.segments.reduce((sum, s) => (s.kind === kind ? sum + s.activeMs : sum), 0);
}

/** null si no tuvo objetivos. */
export function sessionTitle(session: Session): string | null {
  return session.goals[0]?.text ?? null;
}

export function lastActivity(session: Session): number | null {
  const last = session.segments[session.segments.length - 1];
  return last?.endedAt ?? session.startedAt;
}
