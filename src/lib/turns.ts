/** Turn order for multiplayer games. */

/**
 * Order in which players take turns: players with the lowest `best` (their
 * best number of rounds in a row without mistakes) play first. Ties keep the
 * given order.
 */
export function turnOrder<T>(players: readonly T[], best: (player: T) => number): T[] {
  return players
    .map((player, index) => ({ player, index, best: best(player) }))
    .sort((x, y) => x.best - y.best || x.index - y.index)
    .map(({ player }) => player);
}

/** Index of the player after `turn`, in round-robin. */
export function nextTurn(turn: number, playerCount: number): number {
  return playerCount > 0 ? (turn + 1) % playerCount : 0;
}

/** Players after the current one, in the order they will play. */
export function upcoming<T>(players: readonly T[], turn: number): T[] {
  return [...players.slice(turn + 1), ...players.slice(0, turn)];
}
