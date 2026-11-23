export type DesktopAction = "toggle" | "skip";

export interface PlatformStatus {
  /** «15:12 · Enfoque», o vacío si no hay nada en marcha. */
  text: string;
  /** Texto de la acción principal: Empezar, Pausar o Seguir. */
  toggleLabel: string;
  skipLabel: string;
  canSkip: boolean;
}

export interface Platform {
  kind: "desktop" | "web";
  /** Pide permiso si hace falta. Debe llamarse desde un gesto del usuario. */
  prepareNotifications(): Promise<void>;
  notify(title: string, body: string): Promise<void>;
  setStatus(status: PlatformStatus): void;
  onAction(handler: (action: DesktopAction) => void): void;
  /** Devuelve el motivo si el sistema no lo permite. */
  setGlobalShortcut(enabled: boolean): Promise<string | null>;
}
