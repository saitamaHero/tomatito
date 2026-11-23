import { isTauri } from "@tauri-apps/api/core";
import type { Platform } from "./types";

let current: Platform | null = null;

/** Carga solo la plataforma que toca: la web no arrastra el código de Tauri. */
export async function initPlatform(): Promise<void> {
  current = (isTauri() ? await import("./tauri") : await import("./web")).platform;
}

export function platform(): Platform {
  if (!current) throw new Error("La plataforma no está lista");
  return current;
}
