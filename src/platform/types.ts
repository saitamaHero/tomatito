import type { FloatView } from "../core/float";

/** `float` enciende o apaga la ventana flotante. */
export type DesktopAction = "toggle" | "skip" | "float";

/** Motivo por el que el sistema rechazó el atajo global. */
export type ShortcutProblem = "wayland" | "taken" | "unknown";

/** Motivo por el que no puede haber ventana flotante. */
export type FloatProblem = "wayland";

/** Texto de la bandeja que no depende del reloj. */
export interface TrayLabels {
  show: string;
  quit: string;
  float: string;
  /** Aviso de la primera vez que se cierra la ventana. */
  noticeTitle: string;
  noticeBody: string;
}

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
  setLabels(labels: TrayLabels): void;
  onAction(handler: (action: DesktopAction) => void): void;
  /** Avisa al pasar a otra app (true) y al volver (false). */
  onBackground(handler: (away: boolean) => void): void;
  /** null la oculta. */
  setFloat(view: FloatView | null): void;
  floatProblem(): Promise<FloatProblem | null>;
  setGlobalShortcut(enabled: boolean): Promise<ShortcutProblem | null>;
}
