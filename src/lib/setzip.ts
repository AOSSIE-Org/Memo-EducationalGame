/**
 * Card sets as zip files: `cardset.json` (name, topics, descriptions, in one
 * or more languages) and the pictures.
 *
 * cardset.json:
 *   {
 *     "format": "memo-card-set", "version": 1,
 *     "language": "en",                       // language the texts were written in
 *     "name": { "en": "Fruits", "fr": "Fruits" },   // or just "Fruits" (in `language`)
 *     "tags": [{ "en": "Food" }],             // or ["Food"]
 *     "cards": [{ "image": "images/001.webp", "description": { "en": "Apple" } }],
 *     "autoTranslated": ["fr"]                // optional: machine-translated languages
 *   }
 *
 * Files from others are untrusted: sizes are limited before unzipping, every
 * field is validated, texts are cleaned and cut to the editor's limits, and
 * pictures are re-encoded by the app (see src/lib/images.ts) before use.
 */
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import {
  cleanText,
  MAX_CARDS,
  MAX_DESCRIPTION,
  MAX_SET_NAME,
  MAX_TAG,
  MAX_TAGS,
  newId,
  type StoredCardSet,
} from './cardsets';
import { isLanguage, type LanguageCode } from './languages';
import type { Localized } from './types';

export const SET_FORMAT = 'memo-card-set';
export const SET_VERSION = 1;
export const DATA_FILE = 'cardset.json';
/** Limits for loaded zip files. */
export const MAX_ZIP_BYTES = 60 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 300 * 1024 * 1024;
export const MIN_SET_CARDS = 3;

/** Why a card set can't be loaded; also the key of the message shown (`setImport.<reason>`). */
export type SetImportFailure = 'tooLarge' | 'notZip' | 'noData' | 'invalid' | 'unsupportedVersion' | 'tooFewCards' | 'download';

export class SetImportError extends Error {
  constructor(readonly reason: SetImportFailure, message: string = reason) {
    super(message);
  }
}

function fail(reason: SetImportFailure, message?: string): never {
  throw new SetImportError(reason, message);
}

const EXTENSIONS: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

/** The picture type from its first bytes (not from the file name, which can lie). */
export function sniffImage(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  const head = strFromU8(b.subarray(0, 512)).replace(/^﻿/, '').trimStart().toLowerCase();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'image/svg+xml';
  return null;
}

/** Builds the zip file of a card set. */
export async function buildSetZip(set: StoredCardSet, images: ReadonlyMap<string, Blob>): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  const cards = [];
  let i = 0;
  for (const card of set.cards) {
    const blob = images.get(card.id);
    if (!blob) continue;
    const name = `images/${String(++i).padStart(3, '0')}.${EXTENSIONS[blob.type] ?? 'png'}`;
    files[name] = new Uint8Array(await blob.arrayBuffer());
    cards.push({ image: name, description: card.description });
  }
  const data = {
    format: SET_FORMAT,
    version: SET_VERSION,
    language: set.language,
    name: set.name,
    tags: set.tags,
    cards,
    ...(set.auto.length ? { autoTranslated: set.auto } : {}),
  };
  files[DATA_FILE] = strToU8(JSON.stringify(data, null, 2));
  // Pictures are already compressed: store them as they are.
  return zipSync(files, { level: 0 });
}

export interface ParsedSet {
  set: StoredCardSet;
  /** Raw picture bytes by card id, with their sniffed type (still to be re-encoded). */
  images: Map<string, { bytes: Uint8Array; type: string }>;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A localized text from the file: an object by language, or a plain string in `lang`. */
function parseText(v: unknown, lang: LanguageCode, max: number): Localized {
  const out: Localized = {};
  if (typeof v === 'string') {
    const s = cleanText(v, max);
    if (s) out[lang] = s;
  } else if (isObject(v)) {
    for (const [l, s] of Object.entries(v)) {
      if (!isLanguage(l) || typeof s !== 'string') continue;
      const clean = cleanText(s, max);
      if (clean) out[l] = clean;
    }
  } else if (v !== undefined) {
    fail('invalid', 'Invalid text');
  }
  return out;
}

/**
 * Reads a card set zip file. `fallbackLanguage` is assumed for plain strings
 * when the file doesn't say its language. The set gets a new local id.
 */
export function parseSetZip(bytes: Uint8Array, fallbackLanguage: LanguageCode, now: number = Date.now()): ParsedSet {
  if (bytes.length > MAX_ZIP_BYTES) fail('tooLarge');
  if (!(bytes[0] === 0x50 && bytes[1] === 0x4b)) fail('notZip');
  let total = 0;
  let files: Record<string, Uint8Array> = {};
  try {
    files = unzipSync(bytes, {
      filter: (f) => {
        // Refuse zip bombs before inflating anything.
        if (f.originalSize > MAX_IMAGE_BYTES && !f.name.endsWith(DATA_FILE)) fail('tooLarge');
        total += f.originalSize;
        if (total > MAX_TOTAL_BYTES) fail('tooLarge');
        return !f.name.endsWith('/') && !f.name.startsWith('__MACOSX/');
      },
    });
  } catch (err) {
    if (err instanceof SetImportError) throw err;
    fail('notZip');
  }
  // cardset.json at the root, or in a single top folder.
  const dataName = Object.keys(files).filter((n) => n === DATA_FILE || n.endsWith('/' + DATA_FILE)).sort((a, b) => a.length - b.length)[0];
  if (!dataName) fail('noData');
  const base = dataName.slice(0, dataName.length - DATA_FILE.length);
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(strFromU8(files[dataName]));
    if (isObject(parsed)) data = parsed;
  } catch {
    fail('invalid', 'cardset.json is not JSON');
  }
  if (data.format !== SET_FORMAT) fail('invalid', 'Not a Memo card set');
  if (typeof data.version !== 'number' || data.version > SET_VERSION) fail('unsupportedVersion');
  if (data.version !== SET_VERSION) fail('invalid', 'Unknown version');

  const language = isLanguage(data.language) ? data.language : fallbackLanguage;
  const name = parseText(data.name, language, MAX_SET_NAME);
  if (Object.keys(name).length === 0) fail('invalid', 'Missing name');
  if (data.tags !== undefined && !Array.isArray(data.tags)) fail('invalid', 'Invalid tags');
  const tags = ((data.tags as unknown[] | undefined) ?? [])
    .map((t) => parseText(t, language, MAX_TAG))
    .filter((t) => Object.keys(t).length > 0)
    .slice(0, MAX_TAGS);
  if (!Array.isArray(data.cards)) fail('invalid', 'Missing cards');

  const set: StoredCardSet = {
    id: newId('c', now),
    language,
    name,
    tags,
    cards: [],
    auto: Array.isArray(data.autoTranslated) ? (data.autoTranslated as unknown[]).filter(isLanguage) : [],
    createdAt: now,
    updatedAt: now,
  };
  const images = new Map<string, { bytes: Uint8Array; type: string }>();
  for (const item of (data.cards as unknown[]).slice(0, MAX_CARDS)) {
    if (!isObject(item) || typeof item.image !== 'string') fail('invalid', 'Invalid card');
    const c = item as { image: string; description?: unknown };
    const path = (base + c.image).replace(/^\.\//, '');
    const bytes = files[path];
    if (!bytes) continue;
    const type = sniffImage(bytes);
    if (!type) continue;
    const id = `k${set.cards.length + 1}`;
    set.cards.push({ id, description: parseText(c.description, language, MAX_DESCRIPTION) });
    images.set(id, { bytes, type });
  }
  if (set.cards.length < MIN_SET_CARDS) fail('tooFewCards');
  return { set, images };
}
