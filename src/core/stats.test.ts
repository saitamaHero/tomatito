import { describe, expect, it } from "vitest";
import { duration } from "./format";
import { es } from "./i18n/es";
import { cycleMinutes, DEFAULT_SETTINGS, normalizeSettings, stepSetting } from "./settings";
import { computeStats, groupByDay, pomodorosToday } from "./stats";
import type { Session } from "./types";

const MIN = 60_000;
// Lunes 23 de noviembre de 2026.
const NOW = new Date(2026, 10, 23, 18, 0).getTime();
const at = (month: number, day: number, h = 9) => new Date(2026, month - 1, day, h).getTime();

function session(startedAt: number, pomodoros: number, done = 1, total = 2): Session {
  const segments = Array.from({ length: pomodoros }, (_, i) => ({
    kind: "focus" as const,
    startedAt: startedAt + i * 30 * MIN,
    endedAt: startedAt + (i * 30 + 25) * MIN,
    activeMs: 25 * MIN,
  }));
  return {
    id: `${startedAt}`,
    startedAt,
    endedAt: startedAt + pomodoros * 30 * MIN,
    status: "ended",
    rounds: 4,
    done: pomodoros,
    pauses: 0,
    segments,
    goals: Array.from({ length: total }, (_, i) => ({
      id: `${i}`,
      text: `Objetivo ${i}`,
      est: 1,
      spent: 1,
      done: i < done,
    })),
  };
}

const sessions = [
  session(at(11, 23), 4, 3, 3),
  session(at(11, 22, 16), 2),
  session(at(11, 17), 3),
  session(at(11, 16), 5), // fuera de los 7 días
  session(at(10, 25), 1), // primer día de los 30
  session(at(10, 24), 8), // fuera de los 30
];

describe("estadísticas", () => {
  it("resume 7 días por día, con hoy al final", () => {
    const stats = computeStats(sessions, "week", NOW, es);
    expect(stats.bars.map((b) => b.label)).toEqual(["M", "X", "J", "V", "S", "D", "Hoy"]);
    expect(stats.bars.map((b) => b.value)).toEqual([3, 0, 0, 0, 0, 2, 4]);
    expect(stats).toMatchObject({ pomodoros: 9, focusMs: 225 * MIN, goalsDone: 5, goalsTotal: 7 });
  });

  it("resume 30 días por semana y las barras suman el total", () => {
    const stats = computeStats(sessions, "month", NOW, es);
    expect(stats.pomodoros).toBe(15);
    expect(stats.bars.reduce((sum, b) => sum + b.value, 0)).toBe(15);
    expect(stats.bars[0]).toMatchObject({ label: "25 oct", value: 1 });
    expect(stats.bars[stats.bars.length - 1]).toMatchObject({ label: "Esta sem.", value: 4 });
  });

  it("cuenta los pomodoros de hoy", () => {
    expect(pomodorosToday(sessions, NOW)).toBe(4);
    expect(pomodorosToday([], NOW)).toBe(0);
  });

  it("agrupa por día, lo más reciente primero", () => {
    const groups = groupByDay(sessions, NOW, es);
    expect(groups.slice(0, 3).map((g) => g.label)).toEqual([
      "HOY · LUNES 23 NOV",
      "AYER · DOMINGO 22 NOV",
      "MARTES 17 NOV",
    ]);
  });
});

describe("ajustes", () => {
  it("calcula la duración del ciclo", () => {
    expect(duration(cycleMinutes(DEFAULT_SETTINGS))).toBe("2 h 10 min");
    expect(duration(45)).toBe("45 min");
    expect(duration(120)).toBe("2 h");
  });

  it("respeta los límites al subir y bajar", () => {
    expect(stepSetting({ ...DEFAULT_SETTINGS, focus: 90 }, "focus", 1)).toBe(90);
    expect(stepSetting({ ...DEFAULT_SETTINGS, short: 1 }, "short", -1)).toBe(1);
    expect(stepSetting(DEFAULT_SETTINGS, "focus", -1)).toBe(20);
  });

  it("repara lo guardado que falte o sea inválido", () => {
    const fixed = normalizeSettings({ focus: 500, rounds: Number.NaN, sound: false });
    expect(fixed).toMatchObject({ focus: 90, rounds: 4, sound: false, notify: true });
  });
});
