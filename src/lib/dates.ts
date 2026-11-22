/** Local calendar day as `YYYY-MM-DD`. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** The day key `offset` days away from `key` (negative = earlier). */
export function addDays(key: string, offset: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + offset));
}

/** The last `n` day keys, oldest first, ending with `today`. */
export function lastDays(n: number, today: string = dayKey()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
}

export interface Streaks {
  /** Consecutive days played up to today (or yesterday, if not yet played today). */
  current: number;
  /** Longest run of consecutive days ever. */
  best: number;
}

export function streaks(days: Iterable<string>, today: string = dayKey()): Streaks {
  const set = new Set(days);
  let current = 0;
  let day = set.has(today) ? today : addDays(today, -1);
  while (set.has(day)) {
    current++;
    day = addDays(day, -1);
  }
  let best = 0;
  for (const start of set) {
    if (set.has(addDays(start, -1))) continue; // not the start of a run
    let len = 0;
    let d = start;
    while (set.has(d)) {
      len++;
      d = addDays(d, 1);
    }
    best = Math.max(best, len);
  }
  return { current, best };
}
