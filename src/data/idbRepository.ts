import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { FocusState, Session, Settings } from "../core/types";
import type { Repository } from "./repository";

interface TomatitoDB extends DBSchema {
  kv: { key: "settings" | "current"; value: unknown };
  sessions: { key: string; value: Session; indexes: { startedAt: number } };
}

/** IndexedDB no sabe clonar los proxies reactivos de Vue. */
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export class IdbRepository implements Repository {
  private constructor(private db: IDBPDatabase<TomatitoDB>) {}

  static async open(name = "tomatito"): Promise<IdbRepository> {
    const db = await openDB<TomatitoDB>(name, 1, {
      upgrade(database) {
        database.createObjectStore("kv");
        const sessions = database.createObjectStore("sessions", { keyPath: "id" });
        sessions.createIndex("startedAt", "startedAt");
      },
    });
    return new IdbRepository(db);
  }

  async loadSettings() {
    return (await this.db.get("kv", "settings")) as Partial<Settings> | undefined;
  }

  async saveSettings(settings: Settings) {
    await this.db.put("kv", plain(settings), "settings");
  }

  async loadCurrent() {
    return (await this.db.get("kv", "current")) as FocusState | undefined;
  }

  async saveCurrent(state: FocusState) {
    await this.db.put("kv", plain(state), "current");
  }

  listSessions() {
    return this.db.getAllFromIndex("sessions", "startedAt");
  }

  async saveSession(session: Session) {
    await this.db.put("sessions", plain(session));
  }
}
