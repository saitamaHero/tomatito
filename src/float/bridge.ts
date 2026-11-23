/* Lo que la página flotante habla con Rust (src-tauri/src/float.rs). */
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { FloatView } from "../core/float";

export async function connect(
  onView: (view: FloatView) => void,
  onDocked: (docked: boolean) => void,
): Promise<void> {
  let fresh = false;
  await listen<FloatView>("float-view", ({ payload }) => {
    fresh = true;
    onView(payload);
  });
  await listen<boolean>("float-docked", ({ payload }) => onDocked(payload));

  const init = await invoke<{ view: FloatView | null; docked: boolean }>("float_ready");
  onDocked(init.docked);
  // Si ya llegó algo por evento, es más nuevo.
  if (init.view && !fresh) onView(init.view);
}

export function layout(width: number, height: number): void {
  invoke("float_layout", { width, height }).catch(console.error);
}

/** `start` lleva el punto de agarre, desde la esquina de la píldora. */
export type DragStep = { start: { x: number; y: number } } | "move" | "end";

export function drag(step: DragStep): Promise<void> {
  return invoke<void>("float_drag", { step }).catch(console.error);
}

export function act(action: "toggle" | "open"): void {
  invoke("float_action", { action }).catch(console.error);
}
