/**
 * Card sets as the game uses them: built-in sets, translated with the app,
 * and custom sets, made or loaded by the players.
 */
import enCards from '../locales/cards/en.json';
import enCardsExtra from '../locales/cards-extra/en.json';
import enNames from '../locales/names/en.json';
import { FLAGS } from '../data/flags';
import { localText, type StoredCardSet } from './cardsets';
import { capitalName, cardName, coloredShapeName, countryName, i18n, t, type LanguageCode, type MessageKey } from './i18n.svelte';
import { COLOR_IDS, SHAPES, shapeCardId, type ColorId, type ShapeId } from './shapes';
import { CYRILLIC, DIGITS, LATIN, letterId } from './symbols';

export interface PlayCard {
  /** Unique within its set. */
  id: string;
  /** URL of the picture. */
  src: string;
}

export interface CardSetView {
  id: string;
  custom: boolean;
  /** Width / height of the pictures. */
  aspect: number;
  cards: readonly PlayCard[];
  /** Name in the app's language (or the language it was written in). */
  readonly name: string;
  /** Topics in the app's language. */
  readonly tags: string[];
  /** A card's description, with the language it is written in (for speech). */
  describe(cardId: string): { text: string; lang: LanguageCode };
}

// ------------------------------------------------------------------ shapes

const shapeCards = new Map<string, { color: ColorId; shape: ShapeId }>();
for (const color of COLOR_IDS) for (const shape of SHAPES) shapeCards.set(shapeCardId(color, shape), { color, shape });

const SHAPES_SET: CardSetView = {
  id: 'shapes',
  custom: false,
  aspect: 1,
  cards: [...shapeCards.keys()].map((id) => ({ id, src: `./cards/shapes/${id}.svg` })),
  get name() {
    return t('set.shapes');
  },
  get tags() {
    return (['tag.geometry', 'tag.shapes', 'tag.colors', 'tag.math'] as MessageKey[]).map((k) => t(k));
  },
  describe(cardId) {
    const c = shapeCards.get(cardId);
    return { text: c ? coloredShapeName(c.color, c.shape) : cardId, lang: i18n.lang };
  },
};

// ---------------------------------------------------------------- capitals

/** Capitals with photos in Flag Quiz (src/data/capitals.ts), by country code. */
const CAPITAL_CODES = Object.keys(enNames.capitals);

const CAPITALS_SET: CardSetView = {
  id: 'capitals',
  custom: false,
  // Four 3:2 photos in a black frame (scripts/build-capital-cards.mjs).
  aspect: 500 / 340,
  cards: CAPITAL_CODES.map((code) => ({ id: code, src: `./cards/capitals/${code.toLowerCase()}.webp` })),
  get name() {
    return t('set.capitals');
  },
  get tags() {
    return (['tag.geography', 'tag.cities', 'tag.world'] as MessageKey[]).map((k) => t(k));
  },
  describe(code) {
    return { text: t('capitalCard', { capital: capitalName(code), country: countryName(code) }), lang: i18n.lang };
  },
};

// ------------------------------------------------------- other built-in sets

/** A built-in set whose name and topics are messages. */
function builtIn(
  id: string,
  tags: string[],
  aspect: number,
  cards: PlayCard[],
  describe: (cardId: string) => { text: string; lang: LanguageCode },
): CardSetView {
  return {
    id,
    custom: false,
    aspect,
    cards,
    get name() {
      return t(`set.${id}` as MessageKey);
    },
    get tags() {
      return tags.map((k) => t(`tag.${k}` as MessageKey));
    },
    describe,
  };
}

/** Photo sets (scripts/fetch-photo-sets.mjs): the card ids are the keys of the names, "set.card". */
function photoSet(id: string, tags: string[]): CardSetView {
  const ids = Object.keys({ ...enCards, ...enCardsExtra })
    .filter((k) => k.startsWith(id + '.'))
    .map((k) => k.slice(id.length + 1));
  return builtIn(
    id,
    tags,
    1,
    ids.map((c) => ({ id: c, src: `./cards/${id}/${c}.webp` })),
    (c) => ({ text: cardName(`${id}.${c}`), lang: i18n.lang }),
  );
}

const lettersSet = (id: string, letters: string[], lang?: LanguageCode) =>
  builtIn(
    id,
    ['letters', 'reading'],
    1,
    letters.map((_, i) => ({ id: letterId(i), src: `./cards/${id}/${letterId(i)}.svg` })),
    // Letters are spoken with a voice of their own alphabet's language if given (Cyrillic: Russian).
    (c) => ({ text: letters[Number(c.slice(1)) - 1] ?? c, lang: lang ?? i18n.lang }),
  );

const NUMBERS_SET = builtIn(
  'numbers',
  ['numbers', 'math'],
  1,
  DIGITS.map((d) => ({ id: d, src: `./cards/numbers/${d}.svg` })),
  (d) => ({ text: t(`number.${d}` as MessageKey), lang: i18n.lang }),
);

const FLAGS_SET = builtIn(
  'flags',
  ['flags', 'countries', 'geography', 'world'],
  3 / 2,
  FLAGS.map((f) => ({ id: f.code, src: `./cards/flags/${f.code.toLowerCase()}.svg` })),
  (code) => ({ text: countryName(code), lang: i18n.lang }),
);

export const BUILT_IN_SETS: readonly CardSetView[] = [
  SHAPES_SET,
  NUMBERS_SET,
  lettersSet('latin', LATIN),
  lettersSet('cyrillic', CYRILLIC, 'ru'),
  photoSet('commonFruits', ['food', 'fruits', 'nature']),
  photoSet('rareFruits', ['food', 'fruits', 'nature', 'world']),
  photoSet('farmAnimals', ['animals', 'farm']),
  photoSet('mammals', ['animals', 'nature']),
  photoSet('birds', ['animals', 'nature']),
  photoSet('insects', ['animals', 'nature']),
  photoSet('fish', ['animals', 'nature']),
  photoSet('reptiles', ['animals', 'nature']),
  photoSet('amphibians', ['animals', 'nature']),
  photoSet('minerals', ['geology', 'nature']),
  CAPITALS_SET,
  FLAGS_SET,
];

// ------------------------------------------------------------------ custom

/** A custom set as the game uses it; `imageUrl` gives the URL of a card's picture. */
export function customSetView(set: StoredCardSet, imageUrl: (cardId: string) => string): CardSetView {
  const text = (value: StoredCardSet['name']) => localText(value, i18n.lang, set.language);
  return {
    id: set.id,
    custom: true,
    aspect: 1,
    cards: set.cards.map((c) => ({ id: c.id, src: imageUrl(c.id) })),
    get name() {
      return text(set.name).text;
    },
    get tags() {
      return set.tags.map((tag) => text(tag).text).filter(Boolean);
    },
    describe(cardId) {
      const card = set.cards.find((c) => c.id === cardId);
      return card ? text(card.description) : { text: '', lang: i18n.lang };
    },
  };
}
