import { describe, expect, it } from 'vitest';
import { bestGrid, deal } from './memo';

function rng(seed = 1) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

describe('dealing', () => {
  it('deals each chosen card twice, face down', () => {
    const table = deal(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 4, rng());
    expect(table).toHaveLength(8);
    const counts = new Map<string, number>();
    for (const c of table) counts.set(c.cardId, (counts.get(c.cardId) ?? 0) + 1);
    expect([...counts.values()]).toEqual([2, 2, 2, 2]);
    expect(new Set(table.map((c) => c.key)).size).toBe(8);
    expect(table.every((c) => c.state === 'down')).toBe(true);
  });

  it('uses every card when the set is small', () => {
    expect(deal(['a', 'b', 'c'], 6, rng())).toHaveLength(6);
  });
});

describe('layout', () => {
  it('fills a landscape screen with a wide grid', () => {
    const g = bestGrid(24, 1, 1200, 560, 30, 10);
    expect(g.cols).toBeGreaterThan(g.rows);
    expect(g.cols * g.rows).toBeGreaterThanOrEqual(24);
    // The grid fits.
    expect(g.cols * g.cardWidth + (g.cols - 1) * 10).toBeLessThanOrEqual(1200);
    expect(g.rows * (g.cardWidth + 30) + (g.rows - 1) * 10).toBeLessThanOrEqual(560);
  });

  it('uses the shape of the cards', () => {
    expect(bestGrid(12, 1.5, 900, 500, 20, 8).cardWidth).toBeGreaterThan(bestGrid(12, 1, 900, 500, 20, 8).cardWidth);
  });
});
