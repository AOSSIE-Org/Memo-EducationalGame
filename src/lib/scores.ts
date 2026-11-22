/** Per-card-set scores: pairs found and games finished. */
import type { SetScore } from './types';

export const emptyScore = (): SetScore => ({ pairs: 0, completed: 0 });

const count = (v: unknown): number => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : 0);
/** Card set ids: built-in names ("shapes") or local ids ("c-…"). */
export const SET_ID = /^[a-z0-9][a-z0-9-]{0,63}$/i;

/** The score of a player with a card set (created if missing). */
export function scoreFor(scores: Record<string, SetScore>, setId: string): SetScore {
  return (scores[setId] ??= emptyScore());
}

/** Fills in missing or invalid scores and drops invalid entries. */
export function normalizeScores(value: unknown): Record<string, SetScore> {
  const out: Record<string, SetScore> = {};
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return out;
  for (const [id, s] of Object.entries(value as Record<string, Record<string, unknown>>)) {
    if (!SET_ID.test(id) || typeof s !== 'object' || s === null) continue;
    out[id] = { pairs: count(s.pairs), completed: count(s.completed) };
  }
  return out;
}

/** Card sets sorted by decreasing number of pairs found (then by games finished). */
export function byPairs<T extends { score: SetScore }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => b.score.pairs - a.score.pairs || b.score.completed - a.score.completed);
}
