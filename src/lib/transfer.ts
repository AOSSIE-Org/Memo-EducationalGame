/**
 * Export and import of players' data as JSON: one player per file, or a
 * backup of every player on the device in one file.
 */
import { normalizeScores } from './scores';
import { normalizeAvatar } from './users';
import type { User } from './types';
import { isShape } from './shapes';

export const EXPORT_FORMAT = 'memo-player';
/** Version history (files of every version can still be imported): 1. first version. */
export const EXPORT_VERSION = 1;
const SUPPORTED_VERSIONS = [1];
/** A backup of every player: `players` holds one player file each. */
export const BACKUP_FORMAT = 'memo-backup';
export const BACKUP_VERSION = 1;
/** Imported files larger than this are rejected. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_NAME_LENGTH = 16;

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  player: Omit<User, 'id' | 'lastActiveAt'>;
  playDays: string[];
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  players: ExportFile[];
}

export interface ImportedPlayer {
  user: User;
  playDays: string[];
}

/** Why a file can't be imported; also the key of the message shown (`import.<reason>`). */
export type ImportFailure = 'tooLarge' | 'notJson' | 'notPlayerFile' | 'unsupportedVersion' | 'invalid';

export class ImportError extends Error {
  constructor(
    readonly reason: ImportFailure,
    message: string = reason,
  ) {
    super(message);
  }
}

export function buildExport(user: User, playDays: readonly string[], now: Date = new Date()): ExportFile {
  const { id: _id, lastActiveAt: _last, ...player } = user;
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: now.toISOString(), player, playDays: [...playDays] };
}

export function buildBackup(players: readonly { user: User; playDays: readonly string[] }[], now: Date = new Date()): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    players: players.map((p) => buildExport(p.user, p.playDays, now)),
  };
}

/** File name of a backup of all players, with the date. */
export function backupFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `memo-players-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** A safe file name slug. */
export function slug(name: string, fallback: string): string {
  const s = name
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return s || fallback;
}

/** A safe file name for the export of a player. */
export function exportFileName(name: string): string {
  return `memo-${slug(name, 'player')}.json`;
}

// ------------------------------------------------------------------ import

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const COLOR = /^#[0-9a-f]{6}$/i;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function fail(message: string, reason: ImportFailure = 'invalid'): never {
  throw new ImportError(reason, message);
}

/** Parses a player file or a backup of several players; all-or-nothing. */
export function parseImportFile(text: string, now: number = Date.now()): ImportedPlayer[] {
  const data = parseJson(text);
  if (isObject(data) && data.format === BACKUP_FORMAT) {
    if (data.version !== BACKUP_VERSION) fail('Unsupported file version', 'unsupportedVersion');
    if (!Array.isArray(data.players) || data.players.length === 0) fail('Missing players');
    return data.players.map((p: unknown) => parsePlayer(p, now));
  }
  return [parsePlayer(data, now)];
}

function parseJson(text: string): unknown {
  if (text.length > MAX_IMPORT_BYTES) fail('File too large', 'tooLarge');
  try {
    return JSON.parse(text);
  } catch {
    fail('Not a JSON file', 'notJson');
  }
}

function parsePlayer(data: unknown, now: number): ImportedPlayer {
  if (!isObject(data) || data.format !== EXPORT_FORMAT) fail('Not a Memo player file', 'notPlayerFile');
  if (!SUPPORTED_VERSIONS.includes(data.version as number)) fail('Unsupported file version', 'unsupportedVersion');

  const p = data.player;
  if (!isObject(p)) fail('Missing player');
  const name = typeof p.name === 'string' ? [...p.name.trim()].slice(0, MAX_NAME_LENGTH).join('') : '';
  if (!name) fail('Missing player name');
  const a = p.avatar;
  if (!isObject(a) || !isShape(a.shape) || typeof a.color !== 'string' || !COLOR.test(a.color)) fail('Invalid avatar');

  const user: User = {
    name,
    avatar: normalizeAvatar(a),
    theme: p.theme === 'dark' ? 'dark' : 'light',
    scores: normalizeScores(p.scores),
    correctCount: isCount(p.correctCount) ? p.correctCount : 0,
    createdAt: typeof p.createdAt === 'number' && Number.isFinite(p.createdAt) ? p.createdAt : now,
    lastActiveAt: now,
  };

  if (!Array.isArray(data.playDays)) fail('Missing play days');
  const playDays = [...new Set(data.playDays)].map((d) => {
    if (typeof d !== 'string' || !DATE.test(d)) fail('Invalid play day');
    return d;
  });
  playDays.sort();
  return { user, playDays };
}
