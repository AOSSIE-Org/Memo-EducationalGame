import { describe, expect, it } from 'vitest';
import { addDays, dayKey, lastDays, streaks } from './dates';

describe('dayKey / addDays', () => {
  it('formats local dates', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('lists the last n days ending today', () => {
    expect(lastDays(3, '2026-01-02')).toEqual(['2025-12-31', '2026-01-01', '2026-01-02']);
  });
});

describe('streaks', () => {
  const today = '2026-11-20';
  it('is zero without play days', () => {
    expect(streaks([], today)).toEqual({ current: 0, best: 0 });
  });
  it('counts consecutive days up to today', () => {
    expect(streaks(['2026-11-18', '2026-11-19', '2026-11-20'], today).current).toBe(3);
  });
  it('keeps the streak alive until the end of today', () => {
    expect(streaks(['2026-11-18', '2026-11-19'], today).current).toBe(2);
  });
  it('breaks after a missed day', () => {
    expect(streaks(['2026-11-17', '2026-11-18'], today).current).toBe(0);
  });
  it('finds the best run', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-11-19', '2026-11-20'];
    expect(streaks(days, today)).toEqual({ current: 2, best: 4 });
  });
});
