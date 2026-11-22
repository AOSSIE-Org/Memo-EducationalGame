/**
 * A grown-ups-only check: a linear equation that young children can't solve,
 * e.g. "7x − 23 = 2x + 52" (x = 15). Used to confirm destructive actions.
 */
export interface AdultCheck {
  /** The equation, using "x" for the unknown. */
  equation: string;
  answer: number;
}

const int = (rng: () => number, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

export function makeAdultCheck(rng: () => number = Math.random): AdultCheck {
  const a = int(rng, 4, 9);
  const c = int(rng, 2, a - 1);
  // (a − c)·x ≥ 16, so that 11 ≤ b ≤ (a − c)·x − 5 and the right-hand constant stays positive.
  const x = int(rng, Math.max(6, Math.ceil(16 / (a - c))), 19);
  const k = (a - c) * x; // a·x − c·x
  const b = int(rng, 11, k - 5);
  const d = k - b; // a·x − b = c·x + d
  return { equation: `${a}x − ${b} = ${c}x + ${d}`, answer: x };
}

/** Whether a typed answer solves the check. */
export function isSolved(check: AdultCheck, input: string): boolean {
  const n = Number(input.trim().replace(/^x\s*=\s*/i, ''));
  return input.trim() !== '' && Number.isFinite(n) && n === check.answer;
}
