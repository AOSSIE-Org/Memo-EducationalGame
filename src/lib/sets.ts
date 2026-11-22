/**
 * Card sets as the game uses them: built-in sets, translated with the app,
 * and custom sets, made or loaded by the players.
 */
import enNames from '../locales/names/en.json';
import { localText, type StoredCardSet } from './cardsets';
import { capitalName, coloredShapeName, countryName, i18n, t, type LanguageCode, type MessageKey } from './i18n.svelte';
import { COLOR_IDS, SHAPES, shapeCardId, type ColorId, type ShapeId } from './shapes';

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

export const BUILT_IN_SETS: readonly CardSetView[] = [SHAPES_SET, CAPITALS_SET];

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
