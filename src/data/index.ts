import { IdbRepository } from "./idbRepository";
import type { Repository } from "./repository";

let repository: Repository | null = null;

export async function openRepository(): Promise<void> {
  repository = await IdbRepository.open();
  // Pide al navegador que no borre los datos por falta de espacio. Si dice que no,
  // la app funciona igual.
  await navigator.storage?.persist?.().catch(() => false);
}

export function repo(): Repository {
  if (!repository) throw new Error("El repositorio no está abierto");
  return repository;
}
