import { describe, expect, it } from 'vitest';
import { cleanText, editText, isCustomSetId, localText, nameFromFile, newId } from './cardsets';
import { byPairs, normalizeScores } from './scores';

describe('card sets', () => {
  it('gives every custom set a unique local id', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId('c')));
    expect(ids.size).toBe(1000);
    expect(isCustomSetId(newId('c'))).toBe(true);
    expect(isCustomSetId('shapes')).toBe(false);
  });

  it('shows texts in the app language, else in the language they were written in', () => {
    expect(localText({ en: 'Fruits', fr: 'Fruits!' }, 'fr', 'en')).toEqual({ text: 'Fruits!', lang: 'fr' });
    expect(localText({ en: 'Fruits' }, 'de', 'en')).toEqual({ text: 'Fruits', lang: 'en' });
  });

  it('keeps manual translations but drops outdated automatic ones when a text changes', () => {
    const text = { en: 'Apple', fr: 'Pomme', de: 'Apfel' };
    expect(editText(text, 'en', 'Green apple', ['de'])).toEqual({ en: 'Green apple', fr: 'Pomme' });
    expect(editText(text, 'en', 'Apple', ['de'])).toBe(text);
  });

  it('cleans and limits texts', () => {
    expect(cleanText('  a‮b\n  c  ', 10)).toBe('a b c');
    expect(cleanText('😀😀😀', 2)).toBe('😀😀');
    expect(nameFromFile('red_apple-2.PNG')).toBe('red apple 2');
  });
});

describe('scores', () => {
  it('drops invalid scores and sorts by pairs found', () => {
    const s = normalizeScores({ shapes: { pairs: 3, completed: 1 }, 'bad id!': { pairs: 9 }, capitals: { pairs: -1 } });
    expect(s).toEqual({ shapes: { pairs: 3, completed: 1 }, capitals: { pairs: 0, completed: 0 } });
    const rows = byPairs([
      { id: 'a', score: { pairs: 1, completed: 5 } },
      { id: 'b', score: { pairs: 7, completed: 0 } },
    ]);
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
  });
});
