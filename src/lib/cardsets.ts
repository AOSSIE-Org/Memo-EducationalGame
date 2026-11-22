/**
 * Card sets: a name, topics (tags) and cards, each card a picture and a
 * description, all texts in several languages.
 *
 * Built-in sets (src/lib/builtinSets.ts) are translated with the app.
 * Custom sets, made in the card set editor or loaded from a zip file, are
 * stored on the device (IndexedDB) with a unique local id; their texts are
 * written in one language (`language`, the app's language when they were
 * written) and translated into others on the device when possible
 * (src/lib/translate.ts); languages filled in by machine translation are
 * listed in `auto`.
 */
import type { LanguageCode } from './languages';
import type { Localized } from './types';

/** Longest name, topic and description (in characters), so that they fit on tiles and under cards. */
export const MAX_SET_NAME = 32;
export const MAX_TAG = 20;
export const MAX_TAGS = 5;
export const MAX_DESCRIPTION = 40;
/** Most cards in a custom set. */
export const MAX_CARDS = 300;

export interface CustomCard {
  /** Unique within the set. */
  id: string;
  description: Localized;
}

/** A custom card set as stored in IndexedDB (its pictures are stored separately, by card id). */
export interface StoredCardSet {
  /** Unique local id, e.g. "c-lw3k2x9a-8f3k2q": sets with the same name never clash. */
  id: string;
  /** Language the texts were first written in. */
  language: LanguageCode;
  name: Localized;
  tags: Localized[];
  cards: CustomCard[];
  /** Languages whose texts were translated automatically (not written by a person). */
  auto: LanguageCode[];
  createdAt: number;
  updatedAt: number;
}

/** A text in the wanted language if there is one, else in the language it was written in, with that language. */
export function localText(
  text: Localized,
  lang: LanguageCode,
  source: LanguageCode,
): { text: string; lang: LanguageCode } {
  const own = text[lang];
  if (own) return { text: own, lang };
  const original = text[source];
  if (original) return { text: original, lang: source };
  const [first] = Object.entries(text) as [LanguageCode, string][];
  return first ? { text: first[1], lang: first[0] } : { text: '', lang };
}

/** A new unique local id for a custom set or card: time plus randomness. */
export function newId(prefix: string, now: number = Date.now(), rng: () => number = Math.random): string {
  const random = Array.from({ length: 8 }, () => Math.floor(rng() * 36).toString(36)).join('');
  return `${prefix}-${now.toString(36)}-${random}`;
}

/** Ids of custom sets: "c-…"; built-in sets have short names ("shapes", "capitals"). */
export const isCustomSetId = (id: string): boolean => id.startsWith('c-');

/** Control and invisible formatting characters (bidirectional overrides, zero-width…). */
const CONTROL = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2066-\\u2069]', 'g');

/** Removes control characters and extra spaces, and cuts the text to `max` characters (never in the middle of a character). */
export function cleanText(text: string, max: number): string {
  const clean = text.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim();
  return [...clean].slice(0, max).join('').trim();
}

/** Number of characters as people count them (not UTF-16 units). */
export const textLength = (text: string): number => [...text].length;

/** A description from a file name: "red_apple-2.png" → "red apple 2". */
export function nameFromFile(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]+$/i, '').replace(/[_\-.]+/g, ' ');
  return cleanText(base, MAX_DESCRIPTION);
}

/**
 * Applies an edit made in `lang` to a text: sets that language's version and,
 * if it changed, drops the other languages' automatic translations (they
 * translated the old text). Returns the new text.
 */
export function editText(text: Localized, lang: LanguageCode, value: string, auto: readonly LanguageCode[]): Localized {
  if (text[lang] === value) return text;
  const next: Localized = {};
  for (const [l, v] of Object.entries(text) as [LanguageCode, string][]) {
    if (l !== lang && !auto.includes(l)) next[l] = v;
  }
  if (value) next[lang] = value;
  return next;
}

/** `n` distinct random items of `items` (all of them if there are fewer). */
export function sample<T>(items: readonly T[], n: number, rng: () => number = Math.random): T[] {
  const copy = [...items];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  return out;
}

/** Shuffles a copy of `items` (Fisher–Yates). */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
