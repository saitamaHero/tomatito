import type { Phase, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  focus: 25,
  short: 5,
  long: 15,
  rounds: 4,
  dailyGoal: 8,
  autoBreak: true,
  autoFocus: false,
  sound: true,
  notify: true,
  globalShortcut: true,
};

export type NumericSetting = "focus" | "short" | "long" | "rounds" | "dailyGoal";

export const LIMITS: Record<NumericSetting, { min: number; max: number; step: number }> = {
  focus: { min: 5, max: 90, step: 5 },
  short: { min: 1, max: 15, step: 1 },
  long: { min: 5, max: 45, step: 5 },
  rounds: { min: 2, max: 8, step: 1 },
  dailyGoal: { min: 1, max: 16, step: 1 },
};

type Times = Pick<Settings, "focus" | "short" | "long" | "rounds">;

export const PRESETS: { label: string; values: Times }[] = [
  { label: "Clásico 25/5", values: { focus: 25, short: 5, long: 15, rounds: 4 } },
  { label: "Profundo 50/10", values: { focus: 50, short: 10, long: 30, rounds: 3 } },
  { label: "Ágil 15/3", values: { focus: 15, short: 3, long: 10, rounds: 4 } },
];

export function matchesPreset(s: Settings, p: Times): boolean {
  return (Object.keys(p) as (keyof Times)[]).every((k) => s[k] === p[k]);
}

export function stepSetting(s: Settings, key: NumericSetting, direction: 1 | -1): number {
  const { min, max, step } = LIMITS[key];
  return Math.min(max, Math.max(min, s[key] + direction * step));
}

export function cycleMinutes(s: Settings): number {
  return s.rounds * s.focus + (s.rounds - 1) * s.short + s.long;
}

export function phaseMs(phase: Phase, s: Settings): number {
  return s[phase] * 60_000;
}

/** Completa lo guardado por versiones anteriores con los valores por defecto. */
export function normalizeSettings(stored: Partial<Settings> | null | undefined): Settings {
  const merged = { ...DEFAULT_SETTINGS, ...stored };
  for (const key of Object.keys(LIMITS) as NumericSetting[]) {
    const { min, max } = LIMITS[key];
    const value = Number(merged[key]);
    merged[key] = Number.isFinite(value)
      ? Math.min(max, Math.max(min, Math.round(value)))
      : DEFAULT_SETTINGS[key];
  }
  return merged;
}
