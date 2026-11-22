/**
 * Speaks options when the mouse moves onto them, but only on a real
 * transition from "not hovering" to "hovering".
 *
 * When a new round replaces the options, the browser fires `pointerenter` on
 * whichever new option appears under the (unmoved) mouse. That option must
 * not be spoken: it is muted until the mouse leaves it.
 *
 * Usage, in a component (needs a reactive round id):
 *   const hover = hoverSpeech(() => app.round?.id);
 *   <button data-hover-speech onpointerenter={(e) => hover.enter(e, text)} onpointerleave={hover.leave}>
 */
import { speak } from './speech';

export interface HoverSpeech {
  enter(e: PointerEvent, text: string): void;
  leave(e: PointerEvent): void;
}

export function hoverSpeech(roundId: () => unknown): HoverSpeech {
  /** Last known mouse position, to know what is under a stationary mouse. */
  let mouse: { x: number; y: number } | null = null;
  /** The option under the mouse when the current round appeared. */
  let muted: Element | null = null;

  $effect(() => {
    const track = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') mouse = { x: e.clientX, y: e.clientY };
    };
    const opts = { capture: true, passive: true } as const;
    window.addEventListener('pointermove', track, opts);
    window.addEventListener('pointerdown', track, opts);
    return () => {
      window.removeEventListener('pointermove', track, opts);
      window.removeEventListener('pointerdown', track, opts);
    };
  });

  // Runs after each new round is rendered.
  $effect(() => {
    roundId();
    muted = mouse ? (document.elementFromPoint(mouse.x, mouse.y)?.closest('[data-hover-speech]') ?? null) : null;
  });

  return {
    enter(e, text) {
      if (e.pointerType !== 'mouse' || e.currentTarget === muted) return;
      speak(text);
    },
    leave(e) {
      if (e.currentTarget === muted) muted = null;
    },
  };
}
