import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A fake speech engine: records calls; utterances start/end only when told to. */
class FakeSynth {
  speaking = false;
  pending = false;
  paused = false;
  calls: string[] = [];
  queue: FakeUtterance[] = [];
  getVoices = () => [];
  addEventListener() {}
  speak(u: FakeUtterance) {
    this.calls.push(`speak:${u.text}`);
    this.queue.push(u);
    this.pending = true;
  }
  cancel() {
    this.calls.push('cancel');
    for (const u of this.queue) u.onerror?.();
    this.queue = [];
    this.speaking = this.pending = false;
  }
  resume() {
    this.calls.push('resume');
    this.paused = false;
  }
  /** Simulates the engine starting the next utterance. */
  start() {
    const u = this.queue[0];
    this.pending = false;
    this.speaking = true;
    u.onstart?.();
  }
  /** Simulates the engine finishing the current utterance. */
  end() {
    const u = this.queue.shift()!;
    this.speaking = false;
    u.onend?.();
  }
}

class FakeUtterance {
  lang = '';
  voice = null;
  rate = 1;
  onstart?: () => void;
  onend?: () => void;
  onerror?: () => void;
  constructor(public text: string) {}
}

let synth: FakeSynth;
let speech: typeof import('./speech');

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  synth = new FakeSynth();
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  speech = await import('./speech');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('speak', () => {
  it('speaks immediately when idle, without cancelling', () => {
    speech.speak('France');
    expect(synth.calls).toEqual(['speak:France']);
  });

  it('cancels what is being spoken and speaks after a short pause', () => {
    speech.speak('France');
    synth.start();
    speech.speak('Brazil');
    expect(synth.calls).toEqual(['speak:France', 'cancel']);
    vi.advanceTimersByTime(speech.AFTER_CANCEL_MS);
    expect(synth.calls.at(-1)).toBe('speak:Brazil');
  });

  it('does not repeat the same text requested twice in a row', () => {
    speech.speak('France');
    speech.speak('France');
    expect(synth.calls).toEqual(['speak:France']);
  });

  it('speaks again after the previous utterance ended', () => {
    speech.speak('France');
    synth.start();
    synth.end();
    vi.advanceTimersByTime(800);
    speech.speak('France');
    expect(synth.calls).toEqual(['speak:France', 'speak:France']);
  });
});

describe('turning speech off and on', () => {
  it('stays silent while off and speaks again once back on', () => {
    speech.speak('France');
    synth.start();
    speech.setSpeechEnabled(false); // interrupts "France"
    speech.speak('Brazil');
    vi.advanceTimersByTime(1000);
    expect(synth.calls.filter((c) => c.startsWith('speak'))).toEqual(['speak:France']);

    speech.setSpeechEnabled(true);
    // Back on: the engine is reset (cancel + resume) …
    expect(synth.calls.slice(-2)).toEqual(['cancel', 'resume']);
    // … and the next request is spoken right away.
    speech.speak('Brazil');
    expect(synth.calls.at(-1)).toBe('speak:Brazil');
  });

  it('recovers an engine left paused by the interruption', () => {
    speech.setSpeechEnabled(false);
    synth.paused = true;
    speech.setSpeechEnabled(true);
    expect(synth.paused).toBe(false);
  });

  it('cancels a delayed utterance when turned off', () => {
    speech.speak('France');
    synth.start();
    speech.speak('Brazil'); // waits after cancelling
    speech.setSpeechEnabled(false);
    vi.advanceTimersByTime(1000);
    expect(synth.calls).not.toContain('speak:Brazil');
  });
});

describe('watchdog', () => {
  it('resets a stuck engine and retries once', () => {
    speech.speak('France'); // never starts
    vi.advanceTimersByTime(speech.WATCHDOG_MS);
    expect(synth.calls).toEqual(['speak:France', 'cancel', 'resume']);
    vi.advanceTimersByTime(speech.AFTER_CANCEL_MS);
    expect(synth.calls.at(-1)).toBe('speak:France');
    // Still stuck: no endless retries.
    vi.advanceTimersByTime(speech.WATCHDOG_MS + speech.AFTER_CANCEL_MS);
    expect(synth.calls.filter((c) => c === 'speak:France')).toHaveLength(2);
  });

  it('does nothing when the utterance started', () => {
    speech.speak('France');
    synth.start();
    vi.advanceTimersByTime(speech.WATCHDOG_MS * 2);
    expect(synth.calls).toEqual(['speak:France']);
  });
});

describe('language', () => {
  const voice = (lang: string, localService = true) => ({ lang, localService, name: lang }) as SpeechSynthesisVoice;

  it('chooses a voice for the language: same region first, offline first', () => {
    const voices = [voice('en-US'), voice('fr-CA'), voice('fr-FR', false), voice('fr_FR'), voice('hi-IN')];
    expect(speech.chooseVoice(voices, 'fr-FR')).toBe(voices[3]);
    expect(speech.chooseVoice(voices, 'fr-BE')).toBe(voices[1]);
    expect(speech.chooseVoice(voices, 'ur-PK')).toBeNull();
  });

  it('speaks in the chosen language even without a matching voice', () => {
    speech.setSpeechLanguage('ur-PK');
    speech.speak('پاکستان');
    expect((synth.queue[0] as FakeUtterance).lang).toBe('ur-PK');
  });
});
