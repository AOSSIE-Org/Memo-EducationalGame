/**
 * Text-to-speech through the browser's built-in, offline-capable Web Speech API.
 *
 * Speech engines differ in how they handle interruptions, so this module
 * avoids the patterns that are known to leave some of them silent:
 * - it only cancels when something is actually being spoken, and then waits a
 *   moment before speaking again (Safari/iOS and Chrome/Android can drop an
 *   utterance queued right after `cancel()`);
 * - it keeps a reference to the utterance being spoken (Chrome can garbage
 *   collect it mid-speech, after which its events never fire);
 * - it resets the engine (`cancel()` + `resume()`) whenever speech is turned
 *   on or off, so an engine left paused or jammed by an interruption recovers;
 * - a watchdog resets the engine and retries once if an utterance never starts.
 *
 * Utterances are spoken in the app's language (`setSpeechLanguage`), with a
 * voice for that language when the device has one.
 */

/** Wait after cancelling before speaking again. */
export const AFTER_CANCEL_MS = 80;
/** An utterance that hasn't started after this long is considered stuck. */
export const WATCHDOG_MS = 1500;
/** The same text requested again within this time is not repeated. */
const REPEAT_MS = 700;

let voice: SpeechSynthesisVoice | null = null;
/** BCP 47 tag of the language to speak, e.g. "fr-FR". */
let language = 'en-US';
let enabled = true;
let lastText = '';
let lastAt = 0;
/** The utterance being spoken, kept so that it isn't garbage-collected. */
let current: SpeechSynthesisUtterance | null = null;
let delayed: ReturnType<typeof setTimeout> | undefined;
let watchdog: ReturnType<typeof setTimeout> | undefined;

function synth(): SpeechSynthesis | null {
  return typeof globalThis !== 'undefined' && 'speechSynthesis' in globalThis ? globalThis.speechSynthesis : null;
}

/** Normalises voice tags: some engines report "en_US" instead of "en-US". */
const norm = (tag: string) => tag.replace('_', '-').toLowerCase();

/**
 * The best voice for `tag` among `voices`: same language and region, then
 * same language; offline voices first. Null if no voice speaks the language.
 */
export function chooseVoice(voices: readonly SpeechSynthesisVoice[], tag: string): SpeechSynthesisVoice | null {
  const wanted = norm(tag);
  const base = wanted.split('-')[0];
  const same = voices.filter((v) => norm(v.lang).split('-')[0] === base);
  const exact = same.filter((v) => norm(v.lang) === wanted);
  return (
    exact.find((v) => v.localService) ??
    exact[0] ??
    same.find((v) => v.localService) ??
    same[0] ??
    null
  );
}

function pickVoice(): void {
  const s = synth();
  if (!s) return;
  voice = chooseVoice(s.getVoices(), language);
}

/** Sets the language of the text to speak, e.g. "fr-FR". */
export function setSpeechLanguage(tag: string): void {
  if (tag === language) return;
  language = tag;
  pickVoice();
  reset();
}

{
  const s = synth();
  if (s) {
    pickVoice();
    s.addEventListener?.('voiceschanged', pickVoice);
  }
}

/** Stops everything and brings the engine back to a clean, unpaused state. */
function reset(): void {
  const s = synth();
  clearTimeout(delayed);
  clearTimeout(watchdog);
  current = null;
  lastText = '';
  if (!s) return;
  s.cancel();
  s.resume();
}

/** Turns text-to-speech on or off. */
export function setSpeechEnabled(on: boolean): void {
  enabled = on;
  reset();
}

/**
 * Speaks `text`, interrupting anything being spoken. Repeated requests for
 * the same text within a short time are ignored (e.g. hover + click).
 */
export function speak(text: string, lang?: string): void {
  const s = synth();
  if (!enabled || !s || !text) return;
  const now = Date.now();
  if (text === lastText && now - lastAt < REPEAT_MS && current) return;
  lastText = text;
  lastAt = now;
  clearTimeout(delayed);
  clearTimeout(watchdog);

  const busy = s.speaking || s.pending || current !== null;
  if (s.paused) s.resume();
  if (busy) {
    current = null;
    s.cancel();
    delayed = setTimeout(() => utter(text, 1, lang), AFTER_CANCEL_MS);
  } else {
    // Immediately, so that the first utterance stays within the user's gesture (needed on iOS).
    utter(text, 1, lang);
  }
}

/**
 * Speaks `text`; `lang` (a language code like "fr", or a tag like "fr-FR")
 * when the text is not in the app's language, e.g. a card written in another one.
 */
function utter(text: string, attempt: number, lang?: string): void {
  const s = synth();
  if (!enabled || !s) return;
  const u = new SpeechSynthesisUtterance(text);
  const other = lang && norm(lang).split('-')[0] !== norm(language).split('-')[0];
  const v = other ? chooseVoice(s.getVoices(), lang) : voice;
  // Without a voice for the language, the lang tag still lets the engine pick one.
  u.lang = v?.lang.replace('_', '-') ?? (other ? lang : language);
  if (v) u.voice = v;
  u.rate = 0.9;
  let started = false;
  u.onstart = () => {
    started = true;
    clearTimeout(watchdog);
  };
  u.onend = u.onerror = () => {
    if (current === u) current = null;
  };
  current = u;
  s.speak(u);
  watchdog = setTimeout(() => {
    if (started || current !== u || !enabled) return;
    // Stuck: reset the engine and try once more.
    current = null;
    s.cancel();
    s.resume();
    if (attempt < 2) delayed = setTimeout(() => utter(text, attempt + 1, lang), AFTER_CANCEL_MS);
  }, WATCHDOG_MS);
}
