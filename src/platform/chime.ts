/* Campana sintetizada: dos notas con caída suave, sin archivos de audio. */
let context: AudioContext | null = null;

/** Los navegadores solo dejan sonar tras un gesto: se llama al pulsar Empezar. */
export function unlockChime(): void {
  try {
    context ??= new AudioContext();
    void context.resume();
  } catch {
    context = null;
  }
}

export function playChime(): void {
  unlockChime();
  if (!context) return;
  const ctx = context;
  [880, 1318.5].forEach((frequency, i) => {
    const at = ctx.currentTime + i * 0.22;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.25, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
    const tone = ctx.createOscillator();
    tone.type = "sine";
    tone.frequency.value = frequency;
    tone.connect(gain).connect(ctx.destination);
    tone.start(at);
    tone.stop(at + 1.5);
  });
}
