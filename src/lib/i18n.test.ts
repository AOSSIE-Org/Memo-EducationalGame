import { describe, expect, it } from 'vitest';
import en from '../locales/en';
import enNames from '../locales/names/en.json';
import { capitalName, coloredShapeName, countryName, format, LANGUAGES, setLanguage, shapeName, t } from './i18n.svelte';
import { COLOR_IDS, SHAPES } from './shapes';
import { BUILT_IN_SETS } from './sets';
import { describeShape, type ShapeGrammar } from './shapeNames';

const messages = import.meta.glob<{ default: Record<string, string> }>('../locales/*.ts', { eager: true });
const names = import.meta.glob<{ default: Record<string, Record<string, string>> }>('../locales/names/*.json', { eager: true });
const cards = import.meta.glob<{ default: Record<string, string> }>('../locales/cards/*.json', { eager: true });
const cardsExtra = import.meta.glob<{ default: Record<string, string> }>('../locales/cards-extra/*.json', { eager: true });
const shapes = import.meta.glob<{ default: ShapeGrammar }>('../locales/shapes/*.json', { eager: true });
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('translations', () => {
  it.each(LANGUAGES.map((l) => l.code))('%s has every message, with the same placeholders', (code) => {
    const m = messages[`../locales/${code}.ts`]?.default;
    expect(m).toBeDefined();
    expect(Object.keys(m).sort()).toEqual(Object.keys(en).sort());
    for (const [key, text] of Object.entries(en)) {
      expect(text.length > 0 && m[key].trim().length > 0, key).toBe(true);
      expect(placeholders(m[key]), `${code}: ${key}`).toEqual(placeholders(text));
    }
  });

  it.each(LANGUAGES.map((l) => l.code))('%s names every country and capital of the capitals set', (code) => {
    const n = names[`../locales/names/${code}.json`]?.default;
    expect(n).toBeDefined();
    for (const c of Object.keys(enNames.capitals)) {
      expect(n.countries[c], c).toBeTruthy();
      expect(n.capitals[c], c).toBeTruthy();
    }
  });

  it.each(LANGUAGES.map((l) => l.code))('%s names every card of the photo sets', (code) => {
    const names = { ...cards[`../locales/cards/${code}.json`]?.default, ...cardsExtra[`../locales/cards-extra/${code}.json`]?.default };
    for (const set of BUILT_IN_SETS.filter((s) => s.cards[0]?.src.endsWith('.webp') && s.id !== 'capitals')) {
      for (const c of set.cards) {
        const name = names[`${set.id}.${c.id}`];
        expect(name?.trim(), `${set.id}.${c.id}`).toBeTruthy();
        expect([...name].length, `${set.id}.${c.id}`).toBeLessThanOrEqual(40);
      }
    }
  });

  it.each(LANGUAGES.map((l) => l.code))('%s describes every coloured shape', (code) => {
    const g = shapes[`../locales/shapes/${code}.json`]?.default;
    expect(g).toBeDefined();
    const all = new Set<string>();
    for (const c of COLOR_IDS) {
      for (const s of SHAPES) {
        const d = describeShape(g, c, s, code);
        expect(d.trim().length, `${c} ${s}`).toBeGreaterThan(0);
        expect(d).not.toMatch(/[{}]/);
        all.add(d);
      }
    }
    // Every card has its own description.
    expect(all.size).toBe(COLOR_IDS.length * SHAPES.length);
  });
});

describe('i18n', () => {
  it('formats placeholders and leaves unknown ones', () => {
    expect(format('{a} and {b}', { a: 'x' })).toBe('x and {b}');
  });

  it('switches language, direction, names and shapes', async () => {
    const root = { lang: '', dir: '' };
    globalThis.document ??= { documentElement: root } as unknown as Document;
    await setLanguage('fr');
    expect(t('close')).toBe('Fermer');
    expect(countryName('DE')).toBe('Allemagne');
    expect(capitalName('GB')).toBe('Londres');
    expect(coloredShapeName('red', 'star')).toBe('Étoile Rouge');
    await setLanguage('ar');
    expect(document.documentElement.dir).toBe('rtl');
    await setLanguage('en');
    expect(t('close')).toBe('Close');
    expect(coloredShapeName('red', 'circle')).toBe('Red Circle');
    expect(coloredShapeName('grey', 'circleSector')).toBe('Grey Circle Sector');
    expect(shapeName('rightTriangle')).toBe('Right Triangle');
    expect(t('capitalCard', { capital: capitalName('FR'), country: countryName('FR') })).toBe('Paris (France)');
  });
});
