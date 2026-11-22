/** Players saved by any version of the app, brought up to date. */
import { normalizeScores } from './scores';
import { COLORS, isShape } from './shapes';
import type { Avatar, User } from './types';

const COLOR = /^#[0-9a-f]{6}$/i;

/** A valid avatar, or a default one. */
export function normalizeAvatar(value: unknown): Avatar {
  const v = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return {
    shape: isShape(v.shape) ? v.shape : 'circle',
    color: typeof v.color === 'string' && COLOR.test(v.color) ? v.color.toUpperCase() : COLORS.green,
  };
}

/** Fills in fields added in later versions of the app. */
export function withDefaults(user: User): User {
  return {
    ...user,
    avatar: normalizeAvatar(user.avatar),
    correctCount: user.correctCount ?? 0,
    scores: normalizeScores(user.scores),
  };
}
