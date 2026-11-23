/* `VITE_SPEED=60 pnpm dev` acelera el reloj para probar ciclos enteros. Solo en
   desarrollo: en producción es siempre la hora del sistema. */
const speed = import.meta.env.DEV ? Number(import.meta.env.VITE_SPEED) || 1 : 1;
const base = Date.now();

export function now(): number {
  return speed === 1 ? Date.now() : base + (Date.now() - base) * speed;
}
