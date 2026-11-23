import { parse } from "vue/compiler-sfc";
import { describe, expect, it } from "vitest";
import { floatView } from "../float";
import { dayHeading, dayName, shortDate } from "../format";
import { DEFAULT_SETTINGS, normalizeSettings } from "../settings";
import { computeStats } from "../stats";
import { finish, initialState, start } from "../timer";
import type { Language, Settings } from "../types";
import { en } from "./en";
import { es } from "./es";
import { LOCALES, MESSAGES, resolveLocale } from ".";

describe("qué idioma toca", () => {
  it.each<[Language, string[], string]>([
    ["system", ["es"], "es"],
    ["system", ["es-DO", "en"], "es"],
    ["system", ["es_ES"], "es"],
    ["system", ["ES-mx"], "es"],
    ["system", ["en-US", "es"], "en"],
    ["system", ["fr-FR"], "en"],
    ["system", ["fr-FR", "es"], "en"],
    ["system", [], "en"],
    ["es", ["en-US"], "es"],
    ["en", ["es-DO"], "en"],
  ])("%s con el sistema en %j: %s", (language, system, expected) => {
    expect(resolveLocale(language, system)).toBe(expected);
  });

  it("sin nada guardado, o con algo desconocido, sigue al sistema", () => {
    expect(normalizeSettings({ focus: 50 }).language).toBe("system");
    const odd = { language: "klingon" } as unknown as Settings;
    expect(normalizeSettings(odd).language).toBe("system");
    expect(normalizeSettings({ language: "es" }).language).toBe("es");
  });
});

/** Todas las rutas con su valor: «goals.today» → función. */
function entries(value: object, path = ""): [string, unknown][] {
  return Object.entries(value).flatMap(([key, child]) => {
    const here = path ? `${path}.${key}` : key;
    return child && typeof child === "object" && !Array.isArray(child)
      ? entries(child, here)
      : [[here, child] as [string, unknown]];
  });
}

describe("los mensajes", () => {
  it.each(LOCALES)("%s: mismas claves y ninguna vacía", (locale) => {
    const all = entries(MESSAGES[locale]);
    expect(all.map(([key]) => key).sort()).toEqual(entries(es).map(([key]) => key).sort());
    for (const [key, value] of all) if (typeof value === "string") expect(value, key).not.toBe("");
  });

  it.each(LOCALES)("%s: siete días y doce meses", (locale) => {
    const { weekdays, initials, months } = MESSAGES[locale].date;
    expect([weekdays.length, initials.length, months.length]).toEqual([7, 7, 12]);
  });

  it("ninguna función ignora sus valores", () => {
    const args = [7, 9, 8];
    for (const locale of LOCALES) {
      for (const [key, value] of entries(MESSAGES[locale])) {
        if (typeof value !== "function") continue;
        const text = value(...args.map(String)) as string;
        // `pauses` solo elige la palabra.
        if (key !== "detail.pauses") expect(text, `${locale} ${key}`).toContain("7");
      }
    }
  });

  it("plurales", () => {
    expect([0, 1, 2].map(es.detail.pauses)).toEqual(["pausas", "pausa", "pausas"]);
    expect([0, 1, 2].map(en.detail.pauses)).toEqual(["pauses", "pause", "pauses"]);
    expect(en.summary(1, 25)).toBe("1 pomodoro · 25 min of focus");
    expect(en.summary(4, 100)).toBe("4 pomodoros · 100 min of focus");
    expect(es.summary(1, 25)).toBe("1 pomodoro · 25 min de enfoque");
  });
});

describe("en inglés", () => {
  // Lunes 23 de noviembre de 2026.
  const now = new Date(2026, 10, 23, 18).getTime();
  const base: Settings = { ...DEFAULT_SETTINGS, autoBreak: false };
  const view = (state: ReturnType<typeof initialState>, finished: "focus" | "short" | null) =>
    floatView(state, base, { background: true, remainingMs: 60_000, finished, lang: "en" });

  it("fechas", () => {
    expect(shortDate(now, en)).toBe("Nov 23");
    expect(dayName(now, en)).toBe("Monday, Nov 23");
    expect(dayHeading(now, now, en)).toBe("TODAY · MONDAY, NOV 23");
    expect(dayHeading(now - 86_400_000, now, en)).toBe("YESTERDAY · SUNDAY, NOV 22");
  });

  it("gráficos, con la semana desde el lunes", () => {
    const week = computeStats([], "week", now, en).bars.map((b) => b.label);
    expect(week).toEqual(["T", "W", "T", "F", "S", "S", "Today"]);
    const month = computeStats([], "month", now, en).bars.map((b) => b.label);
    expect(month).toEqual(["Oct 25", "Oct 26", "Nov 2", "Nov 9", "Nov 16", "This wk"]);
  });

  it("ventana flotante", () => {
    const running = start(initialState(base), base, now);
    expect(view(running, null)).toMatchObject({
      label: "FOCUS",
      toggleLabel: "Pause",
      lang: "en",
    });
    const done = finish(running, base, running.timer.endsAt!);
    expect(view(done.state, "focus")).toMatchObject({
      title: "Pomodoro 1 finished",
      body: "Click for a 5 min break",
      action: "Take a break",
      lang: "en",
    });
  });
});

describe("no queda texto suelto en el código", () => {
  const vue = import.meta.glob<string>("../../**/*.vue", {
    query: "?raw",
    import: "default",
    eager: true,
  });
  const ts = import.meta.glob<string>(["../../**/*.ts", "!../../**/*.test.ts", "!./*.ts"], {
    query: "?raw",
    import: "default",
    eager: true,
  });
  const attributes = ["aria-label", "title", "placeholder", "label", "hint", "alt", "body"];
  /** No se traducen: el nombre de la app y su inicial en el riel. */
  const allowed = new Set(["Tomatito", "T"]);
  const isText = (text: string) => /\p{L}/u.test(text) && !allowed.has(text.trim());

  it.each(Object.entries(vue))("%s: plantilla", (file, source) => {
    const found: string[] = [];
    type Node = { type: number; content?: unknown; props?: Node[]; children?: Node[] } & {
      name?: string;
      value?: { content: string };
    };
    const visit = (node: Node) => {
      // 2: texto; 6: atributo sin `:`.
      if (node.type === 2 && isText(String(node.content))) found.push(String(node.content).trim());
      for (const prop of node.props ?? []) {
        if (prop.type === 6 && attributes.includes(prop.name!) && isText(prop.value?.content ?? ""))
          found.push(`${prop.name}="${prop.value!.content}"`);
      }
      node.children?.forEach(visit);
    };
    visit(parse(source, { filename: file }).descriptor.template!.ast as unknown as Node);
    expect(found).toEqual([]);
  });

  it.each(Object.entries({ ...vue, ...ts }))("%s: código", (_file, source) => {
    const code = source
      .replace(/<style[\s\S]*?<\/style>/g, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|\s)\/\/.*$/gm, "");
    // Acentos y signos que solo pueden ser texto en español. Los errores internos no
    // llegan a la pantalla.
    const strings = code.match(/(["'`])(?:(?!\1)[^\\\n]|\\.)*\1/g) ?? [];
    const suspicious = strings.filter((s) => /[áéíóúñ¡¿«]/i.test(s));
    expect(suspicious.filter((s) => !code.includes(`new Error(${s})`))).toEqual([]);
  });
});
