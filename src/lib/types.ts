import { DEFAULT_LANGUAGE, type LanguageCode } from './languages';
import type { ShapeId } from './shapes';

/** Device-wide preferences. */
export interface Settings {
  /** Read the cards aloud. */
  speech: boolean;
  /** Feedback sounds. */
  sounds: boolean;
  /** Multiplayer: maximum rounds in a row per player while they keep finding pairs. */
  turnRounds: number;
  /** Language of the app. */
  language: LanguageCode;
  /** Daily reminder notification (installed app only). */
  reminders: boolean;
  /** Pairs of cards on the table. */
  pairs: number;
  /** Seconds that two cards which are not a pair stay face up. */
  showSeconds: number;
  /** The card set played last. */
  lastSet?: string;
}

/** The numbers of pairs that can be chosen, with the grid they fill on a landscape screen. */
export const PAIR_OPTIONS: readonly { pairs: number; cols: number; rows: number }[] = [
  { pairs: 3, cols: 3, rows: 2 },
  { pairs: 4, cols: 4, rows: 2 },
  { pairs: 6, cols: 4, rows: 3 },
  { pairs: 8, cols: 4, rows: 4 },
  { pairs: 10, cols: 5, rows: 4 },
  { pairs: 12, cols: 6, rows: 4 },
  { pairs: 15, cols: 6, rows: 5 },
  { pairs: 18, cols: 6, rows: 6 },
  { pairs: 21, cols: 7, rows: 6 },
  { pairs: 24, cols: 8, rows: 6 },
];
export const MIN_PAIRS = PAIR_OPTIONS[0].pairs;

export const DEFAULT_SETTINGS: Settings = {
  speech: true,
  sounds: true,
  turnRounds: 3,
  language: DEFAULT_LANGUAGE,
  reminders: false,
  pairs: 6,
  showSeconds: 5,
};
export const TURN_ROUNDS_MIN = 1;
export const TURN_ROUNDS_MAX = 10;
export const SHOW_SECONDS_MIN = 1;
export const SHOW_SECONDS_MAX = 15;

export type Theme = 'light' | 'dark';

/** A player's avatar: a shape in a colour (#RRGGBB). */
export interface Avatar {
  shape: ShapeId;
  color: string;
}

export interface User {
  id?: number;
  name: string;
  avatar: Avatar;
  theme: Theme;
  /** Scores per card set (by card set id). */
  scores: Record<string, SetScore>;
  /** Pairs found with all card sets (green check mark). */
  correctCount: number;
  createdAt: number;
  lastActiveAt: number;
}

/** A player's scores with one card set. */
export interface SetScore {
  /** Pairs found with this card set (gold "two cards"). */
  pairs: number;
  /** Games finished with this card set (gold star). */
  completed: number;
}

/** Text in several languages, by language code. */
export type Localized = Partial<Record<LanguageCode, string>>;
