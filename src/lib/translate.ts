/**
 * Translation of the texts of custom card sets, on the device.
 *
 * People write a card set's name, topics and descriptions in the app's
 * current language. To show them in other languages, the app uses the
 * browser's built-in Translator API (Chrome 138+ and other browsers as they
 * add it): translation models run locally, so the texts never leave the
 * device, and work offline once downloaded. Translations are saved with the
 * set and marked as automatic; anyone can correct them by editing the set in
 * that language. Without the API, texts are shown (and read aloud, with a
 * voice of their own language) as they were written.
 */
import type { StoredCardSet } from './cardsets';
import type { LanguageCode } from './languages';
import type { Localized } from './types';

interface Translator {
  translate(text: string): Promise<string>;
  destroy?(): void;
}
interface TranslatorFactory {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<string>;
  create(options: { sourceLanguage: string; targetLanguage: string }): Promise<Translator>;
}

function factory(): TranslatorFactory | null {
  const f = (globalThis as { Translator?: TranslatorFactory }).Translator;
  return f && typeof f.create === 'function' ? f : null;
}

/** Whether this browser can translate on the device at all. */
export function canTranslate(): boolean {
  return factory() !== null;
}

/** Language tags the Translator API expects. */
const TAGS: Partial<Record<LanguageCode, string>> = { yue: 'zh-Hant', nb: 'no' };
const tag = (l: LanguageCode) => TAGS[l] ?? l;

/** Whether `text` needs a translation into `lang`. */
const missing = (text: Localized, lang: LanguageCode) => !text[lang] && Object.keys(text).length > 0;

/** Whether any text of the set has no version in `lang`. */
export function needsTranslation(set: StoredCardSet, lang: LanguageCode): boolean {
  return [set.name, ...set.tags, ...set.cards.map((c) => c.description)].some((t) => missing(t, lang));
}

/**
 * Translates the missing texts of `set` into `lang`, from the language they
 * were written in. Returns the translated set, or null if the browser can't
 * (the language pair is unavailable, or the model can't be downloaded now).
 */
export async function translateSet(set: StoredCardSet, lang: LanguageCode): Promise<StoredCardSet | null> {
  const f = factory();
  if (!f || lang === set.language || !needsTranslation(set, lang)) return null;
  const options = { sourceLanguage: tag(set.language), targetLanguage: tag(lang) };
  let translator: Translator;
  try {
    if ((await f.availability(options)) === 'unavailable') return null;
    translator = await f.create(options);
  } catch {
    return null;
  }
  try {
    const tr = async (text: Localized): Promise<Localized> => {
      const source = text[set.language];
      if (!missing(text, lang) || !source) return text;
      const out = (await translator.translate(source)).trim();
      return out ? { ...text, [lang]: out } : text;
    };
    return {
      ...set,
      name: await tr(set.name),
      tags: await Promise.all(set.tags.map(tr)),
      cards: await Promise.all(set.cards.map(async (c) => ({ ...c, description: await tr(c.description) }))),
      auto: set.auto.includes(lang) ? set.auto : [...set.auto, lang],
    };
  } catch {
    return null;
  } finally {
    translator.destroy?.();
  }
}
