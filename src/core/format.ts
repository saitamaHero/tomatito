import type { Messages } from "./i18n";
import type { Phase } from "./types";

export const PHASES: Phase[] = ["focus", "short", "long"];

const pad = (n: number) => String(n).padStart(2, "0");

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Suma días de calendario: no se descuadra con los cambios de hora. */
export function addDays(dayStart: number, days: number): number {
  const d = new Date(dayStart);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime();
}

export function clock(ms: number): string {
  const secs = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;
}

export function hour(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const toMinutes = (ms: number) => Math.round(ms / 60_000);

export function shortDate(ts: number, m: Messages): string {
  const d = new Date(ts);
  return m.date.short(d.getDate(), m.date.months[d.getMonth()]);
}

export function dayName(ts: number, m: Messages): string {
  const d = new Date(ts);
  return m.date.full(m.date.weekdays[d.getDay()], d.getDate(), m.date.months[d.getMonth()]);
}

export function dayHeading(ts: number, now: number, m: Messages): string {
  const day = startOfDay(ts);
  const today = startOfDay(now);
  const parts = [dayName(ts, m)];
  if (day === today) parts.unshift(m.date.today);
  else if (day === addDays(today, -1)) parts.unshift(m.date.yesterday);
  return parts.join(" · ").toUpperCase();
}
