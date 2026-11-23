export function startTicker(onTick: () => void): void {
  try {
    const worker = new Worker(new URL("./ticker.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = onTick;
  } catch {
    setInterval(onTick, 250);
  }
}
