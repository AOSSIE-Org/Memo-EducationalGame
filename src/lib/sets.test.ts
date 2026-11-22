import { describe, expect, it } from 'vitest';
import { BUILT_IN_SETS } from './sets';
import { MIN_SET_CARDS } from './setzip';

/** Every card picture shipped with the app (only the file names are read). */
const pictures = new Set(Object.keys(import.meta.glob('../../public/cards/**/*.{svg,webp}')).map((p) => p.replace('../../public/', './')));

describe('built-in card sets', () => {
  it.each(BUILT_IN_SETS.map((s) => s.id))('%s has enough cards, unique ids and every picture', (id) => {
    const set = BUILT_IN_SETS.find((s) => s.id === id)!;
    expect(set.cards.length).toBeGreaterThanOrEqual(Math.max(MIN_SET_CARDS, 10));
    expect(new Set(set.cards.map((c) => c.id)).size).toBe(set.cards.length);
    for (const c of set.cards) expect(pictures.has(c.src), c.src).toBe(true);
  });

  it('has unique set ids', () => {
    expect(new Set(BUILT_IN_SETS.map((s) => s.id)).size).toBe(BUILT_IN_SETS.length);
  });
});
