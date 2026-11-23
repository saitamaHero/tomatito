import type { Phase } from "./types";

export const PHASES: Phase[] = ["focus", "short", "long"];

export const PHASE_LABEL: Record<Phase, string> = {
  focus: "Enfoque",
  short: "Descanso corto",
  long: "Descanso largo",
};

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const WEEKDAY_INITIALS = ["D", "L", "M", "X", "J", "V", "S"];
const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic",
];

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

export function shortDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function dayName(ts: number): string {
  return `${WEEKDAYS[new Date(ts).getDay()]} ${shortDate(ts)}`;
}

export function dayHeading(ts: number, now: number): string {
  const day = startOfDay(ts);
  const today = startOfDay(now);
  const prefix = day === today ? "hoy · " : day === addDays(today, -1) ? "ayer · " : "";
  return (prefix + dayName(ts)).toUpperCase();
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
