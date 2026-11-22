/** The table of cards: dealing and layout (pure, tested). */
import { sample, shuffle } from './cardsets';

/**
 * - `down`: face down;
 * - `up`: face up, picked in the current round;
 * - `matched`: part of a pair just found, flying to the player;
 * - `gone`: taken from the table.
 */
export type CardState = 'down' | 'up' | 'matched' | 'gone';

export interface TableCard {
  /** Position-independent key, unique on the table. */
  key: number;
  cardId: string;
  state: CardState;
}

/** `pairs` random cards of `cardIds`, twice each, shuffled. */
export function deal(cardIds: readonly string[], pairs: number, rng: () => number = Math.random): TableCard[] {
  const chosen = sample(cardIds, pairs, rng);
  return shuffle([...chosen, ...chosen], rng).map((cardId, key) => ({ key, cardId, state: 'down' }));
}

export interface Grid {
  cols: number;
  rows: number;
  /** Width of a card, in px. */
  cardWidth: number;
}

/**
 * The grid that shows `count` cards as large as possible in `width` × `height`:
 * each cell is a card of the given `aspect` (width / height) with room for a
 * label of height `labelHeight` under it, cells `gap` apart.
 */
export function bestGrid(count: number, aspect: number, width: number, height: number, labelHeight: number, gap: number): Grid {
  let best: Grid = { cols: 1, rows: count, cardWidth: 0 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    // Skip grids whose last row would be less than half full (except tiny tables).
    if (rows > 1 && count - (rows - 1) * cols < cols / 2 && count > 4) continue;
    const byWidth = (width - (cols - 1) * gap) / cols;
    const byHeight = ((height - (rows - 1) * gap) / rows - labelHeight) * aspect;
    const cardWidth = Math.floor(Math.min(byWidth, byHeight));
    if (cardWidth > best.cardWidth) best = { cols, rows, cardWidth };
  }
  return best;
}
