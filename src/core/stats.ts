import { addDays, dayHeading, shortDate, startOfDay, WEEKDAY_INITIALS } from "./format";
import { goalsDone } from "./session";
import type { Session } from "./types";

export type Range = "week" | "month";

export interface Bar {
  label: string;
  value: number;
  current: boolean;
}

export interface Stats {
  pomodoros: number;
  focusMs: number;
  goalsDone: number;
  goalsTotal: number;
  bars: Bar[];
}

const DAYS: Record<Range, number> = { week: 7, month: 30 };

export function rangeStart(range: Range, now: number): number {
  return addDays(startOfDay(now), 1 - DAYS[range]);
}

export function sessionsInRange(sessions: Session[], range: Range, now: number): Session[] {
  const from = rangeStart(range, now);
  return sessions.filter((s) => s.startedAt !== null && s.startedAt >= from);
}

function focusSegments(sessions: Session[], from: number) {
  return sessions
    .flatMap((s) => s.segments)
    .filter((seg) => seg.kind === "focus" && seg.endedAt >= from);
}

function mondayOf(ts: number): number {
  const day = startOfDay(ts);
  return addDays(day, -((new Date(day).getDay() + 6) % 7));
}

export function computeStats(sessions: Session[], range: Range, now: number): Stats {
  const from = rangeStart(range, now);
  const today = startOfDay(now);
  const focus = focusSegments(sessions, from);
  const inRange = sessionsInRange(sessions, range, now);

  const bucketOf = range === "week" ? startOfDay : mondayOf;
  const counts = new Map<number, number>();
  for (let day = from; day <= today; day = addDays(day, 1)) counts.set(bucketOf(day), 0);
  for (const seg of focus) {
    const key = bucketOf(seg.endedAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const currentKey = bucketOf(now);
  const bars = [...counts].map(([key, value]) => {
    const current = key === currentKey;
    let label: string;
    if (range === "week") {
      label = current ? "Hoy" : WEEKDAY_INITIALS[new Date(key).getDay()];
    } else {
      label = current ? "Esta sem." : shortDate(Math.max(key, from));
    }
    return { label, value, current };
  });

  return {
    pomodoros: focus.length,
    focusMs: focus.reduce((sum, seg) => sum + seg.activeMs, 0),
    goalsDone: inRange.reduce((sum, s) => sum + goalsDone(s), 0),
    goalsTotal: inRange.reduce((sum, s) => sum + s.goals.length, 0),
    bars,
  };
}

export function pomodorosToday(sessions: Session[], now: number): number {
  return focusSegments(sessions, startOfDay(now)).length;
}

export interface DayGroup {
  key: number;
  label: string;
  sessions: Session[];
}

/** Agrupa por día de inicio, lo más reciente primero. */
export function groupByDay(sessions: Session[], now: number): DayGroup[] {
  const groups = new Map<number, Session[]>();
  const started = sessions.filter((s) => s.startedAt !== null);
  for (const s of started.sort((a, b) => b.startedAt! - a.startedAt!)) {
    const key = startOfDay(s.startedAt!);
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups].map(([key, list]) => ({
    key,
    label: dayHeading(key, now),
    sessions: list,
  }));
}
