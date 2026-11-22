import { describe, expect, it } from 'vitest';
import { isSolved, makeAdultCheck } from './adultCheck';

describe('adult check', () => {
  it('always produces a valid equation with a positive integer answer', () => {
    for (let i = 0; i < 2000; i++) {
      const { equation, answer } = makeAdultCheck();
      const m = equation.match(/^(\d+)x − (\d+) = (\d+)x \+ (\d+)$/);
      expect(m, equation).not.toBeNull();
      const [a, b, c, d] = m!.slice(1).map(Number);
      expect(a * answer - b).toBe(c * answer + d);
      expect(a).toBeGreaterThan(c);
      expect(d).toBeGreaterThan(0);
      expect(answer).toBeGreaterThanOrEqual(6);
    }
  });

  it('accepts only the right answer', () => {
    const check = { equation: '7x − 23 = 2x + 52', answer: 15 };
    expect(isSolved(check, '15')).toBe(true);
    expect(isSolved(check, ' x = 15 ')).toBe(true);
    expect(isSolved(check, '14')).toBe(false);
    expect(isSolved(check, '')).toBe(false);
    expect(isSolved(check, 'abc')).toBe(false);
  });
});
