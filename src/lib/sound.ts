/** Short feedback sounds synthesised with the Web Audio API (no audio files). */

let ctx: AudioContext | null = null;
let enabled = true;

/** Turns the feedback sounds on or off. */
export function setSoundsEnabled(on: boolean): void {
  enabled = on;
}

function audio(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, type: OscillatorType, gain = 0.12) {
  if (!enabled) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** A cheerful rising arpeggio. */
export function playCorrect(): void {
  tone(523.25, 0, 0.18, 'triangle');
  tone(659.25, 0.08, 0.18, 'triangle');
  tone(783.99, 0.16, 0.3, 'triangle');
}

/** A soft, low "bonk". */
export function playWrong(): void {
  tone(196, 0, 0.22, 'sine', 0.15);
  tone(147, 0.1, 0.28, 'sine', 0.12);
}
