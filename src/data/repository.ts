import type { FocusState, Session, Settings } from "../core/types";

export interface Repository {
  loadSettings(): Promise<Partial<Settings> | undefined>;
  saveSettings(settings: Settings): Promise<void>;
  /** Reloj y sesión en curso. */
  loadCurrent(): Promise<FocusState | undefined>;
  saveCurrent(state: FocusState): Promise<void>;
  /** Sesiones cerradas, por orden de inicio. */
  listSessions(): Promise<Session[]>;
  saveSession(session: Session): Promise<void>;
}
