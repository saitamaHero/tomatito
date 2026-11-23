import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { reactive } from "vue";
import { DEFAULT_SETTINGS } from "../core/settings";
import { emptySession } from "../core/session";
import { initialState, start } from "../core/timer";
import { IdbRepository } from "./idbRepository";

let n = 0;
const open = () => IdbRepository.open(`test-${n++}`);

describe("IdbRepository", () => {
  it("empieza vacío", async () => {
    const repo = await open();
    expect(await repo.loadSettings()).toBeUndefined();
    expect(await repo.loadCurrent()).toBeUndefined();
    expect(await repo.listSessions()).toEqual([]);
  });

  it("guarda y recupera ajustes y estado, también desde proxies de Vue", async () => {
    const repo = await open();
    const state = start(initialState(DEFAULT_SETTINGS), DEFAULT_SETTINGS, 1000);
    await repo.saveSettings(reactive({ ...DEFAULT_SETTINGS, focus: 50 }));
    await repo.saveCurrent(reactive(state));
    expect(await repo.loadSettings()).toMatchObject({ focus: 50 });
    expect(await repo.loadCurrent()).toEqual(state);
  });

  it("lista por inicio y actualiza sin duplicar", async () => {
    const repo = await open();
    const a = { ...emptySession(DEFAULT_SETTINGS), startedAt: 200 };
    const b = { ...emptySession(DEFAULT_SETTINGS), startedAt: 100 };
    await repo.saveSession(a);
    await repo.saveSession(b);
    await repo.saveSession({ ...a, done: 3 });
    const list = await repo.listSessions();
    expect(list.map((s) => [s.startedAt, s.done])).toEqual([[100, 0], [200, 3]]);
  });
});
