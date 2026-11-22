import { describe, expect, it } from 'vitest';
import { nextTurn, turnOrder, upcoming } from './turns';

describe('turnOrder', () => {
  it('puts players with the lowest best run first, keeping ties in order', () => {
    const players = [
      { name: 'A', best: 10 },
      { name: 'B', best: 2 },
      { name: 'C', best: 10 },
      { name: 'D', best: 0 },
    ];
    expect(turnOrder(players, (p) => p.best).map((p) => p.name)).toEqual(['D', 'B', 'A', 'C']);
  });
});

describe('nextTurn / upcoming', () => {
  it('cycles round-robin', () => {
    expect([0, 1, 2].map((t) => nextTurn(t, 3))).toEqual([1, 2, 0]);
    expect(nextTurn(0, 1)).toBe(0);
    expect(nextTurn(0, 0)).toBe(0);
  });
  it('lists the next players in order', () => {
    expect(upcoming(['A', 'B', 'C', 'D'], 1)).toEqual(['C', 'D', 'A']);
    expect(upcoming(['A'], 0)).toEqual([]);
  });
});
