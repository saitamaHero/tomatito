import type { FloatView } from "../core/float";

/** `float` enciende o apaga la ventana flotante. */
export type DesktopAction = "toggle" | "skip" | "float";

export interface PlatformStatus {
  /** «15:12 · Enfoque», o vacío si no hay nada en marcha. */
  text: string;
  /** Texto de la acción principal: Empezar, Pausar o Seguir. */
  toggleLabel: string;
  skipLabel: string;
  canSkip: boolean;
  /** La ventana flotante está activada en Ajustes. */
  floatOn: boolean;
}

export interface Platform {
  kind: "desktop" | "web";
  /** Pide permiso si hace falta. Debe llamarse desde un gesto del usuario. */
  prepareNotifications(): Promise<void>;
  notify(title: string, body: string): Promise<void>;
  setStatus(status: PlatformStatus): void;
  onAction(handler: (action: DesktopAction) => void): void;
  /** Avisa al pasar a otra app (true) y al volver (false). */
  onBackground(handler: (away: boolean) => void): void;
  /** null la oculta. */
  setFloat(view: FloatView | null): void;
  /** Motivo si el sistema no admite la ventana flotante. */
  floatProblem(): Promise<string | null>;
  /** Devuelve el motivo si el sistema no lo permite. */
  setGlobalShortcut(enabled: boolean): Promise<string | null>;
}
