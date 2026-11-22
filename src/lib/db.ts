import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { StoredCardSet } from './cardsets';
import { isLanguage } from './languages';
import type { ReminderConfig } from './reminders';
import { DEFAULT_SETTINGS, type Settings, type User } from './types';

/** The picture of a card of a custom card set. */
export interface CardImage {
  setId: string;
  cardId: string;
  blob: Blob;
}

/**
 * How pictures are stored: bytes and type, not Blobs, which Safari can't
 * store in some cases (private browsing, ephemeral sessions).
 */
interface StoredImage {
  setId: string;
  cardId: string;
  data: ArrayBuffer;
  type: string;
}

interface MemoDB extends DBSchema {
  users: { key: number; value: User };
  playDays: {
    key: [number, string];
    value: { userId: number; date: string };
    indexes: { byUser: number };
  };
  /**
   * Device-wide preferences, under the key "settings"; under "reminder", what
   * the service worker needs for the daily reminder (public/sw-reminder.js).
   */
  settings: { key: string; value: Settings | ReminderConfig };
  /** Card sets made or loaded by the players, by their local id. */
  cardSets: { key: string; value: StoredCardSet };
  /** Pictures of the custom card sets. */
  cardImages: { key: [string, string]; value: StoredImage; indexes: { bySet: string } };
}

export type DB = IDBPDatabase<MemoDB>;

export const DB_NAME = 'memo';
/**
 * Version history (record a fixture in src/lib/fixtures before changing it):
 * 1. users, playDays, settings, cardSets, cardImages
 */
export const DB_VERSION = 1;
const SETTINGS_KEY = 'settings';

/** What to do when other open copies of the app get in the way of each other. */
export interface OpenEvents {
  /** An older copy, open in another tab or window, prevents the upgrade; it continues once that copy closes. */
  blocked?: () => void;
  /** A newer copy wants to upgrade the data: this connection has been closed and must not be used. */
  blocking?: () => void;
}

/**
 * Opens (and if needed upgrades) the database. Rejects with a `VersionError`
 * DOMException when the data was saved by a newer version of the app.
 */
export function openDatabase(name: string = DB_NAME, events: OpenEvents = {}): Promise<DB> {
  let db: DB | undefined;
  const opening = openDB<MemoDB>(name, DB_VERSION, {
    blocked: () => events.blocked?.(),
    blocking: () => {
      db?.close();
      events.blocking?.();
    },
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
        const days = db.createObjectStore('playDays', { keyPath: ['userId', 'date'] });
        days.createIndex('byUser', 'userId');
        db.createObjectStore('settings');
        db.createObjectStore('cardSets', { keyPath: 'id' });
        const images = db.createObjectStore('cardImages', { keyPath: ['setId', 'cardId'] });
        images.createIndex('bySet', 'setId');
      }
    },
  });
  return opening.then((opened) => (db = opened));
}

/** Users, most recently active first. */
export async function listUsers(db: DB): Promise<User[]> {
  const users = await db.getAll('users');
  return users.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}

/** Inserts or updates a user and returns it with its id. */
export async function saveUser(db: DB, user: User): Promise<User> {
  const copy = structuredClone(user);
  if (copy.id === undefined) delete copy.id;
  const id = await db.put('users', copy);
  return { ...copy, id };
}

export async function addPlayDay(db: DB, userId: number, date: string): Promise<void> {
  await db.put('playDays', { userId, date });
}

export async function getPlayDays(db: DB, userId: number): Promise<string[]> {
  const rows = await db.getAllFromIndex('playDays', 'byUser', userId);
  return rows.map((r) => r.date).sort();
}

/** Creates a new user together with their play days, atomically. */
export async function insertUserWithData(db: DB, user: User, playDays: string[]): Promise<User> {
  const tx = db.transaction(['users', 'playDays'], 'readwrite');
  const copy = structuredClone(user);
  delete copy.id;
  const id = await tx.objectStore('users').add(copy);
  await Promise.all(playDays.map((date) => tx.objectStore('playDays').put({ userId: id, date })));
  await tx.done;
  return { ...copy, id };
}

/** Deletes a user with all their play days, atomically. */
export async function deleteUserWithData(db: DB, userId: number): Promise<void> {
  const tx = db.transaction(['users', 'playDays'], 'readwrite');
  const dayKeys = await tx.objectStore('playDays').index('byUser').getAllKeys(userId);
  await Promise.all([tx.objectStore('users').delete(userId), ...dayKeys.map((k) => tx.objectStore('playDays').delete(k))]);
  await tx.done;
}

export async function getSettings(db: DB): Promise<Settings> {
  const settings = { ...DEFAULT_SETTINGS, ...(((await db.get('settings', SETTINGS_KEY)) as Settings | undefined) ?? {}) };
  if (typeof settings.reminders !== 'boolean') settings.reminders = false;
  if (!isLanguage(settings.language)) settings.language = DEFAULT_SETTINGS.language;
  return settings;
}

/** Writes what the service worker needs for the daily reminder, keeping the day it was last shown. */
export async function saveReminder(db: DB, config: Omit<ReminderConfig, 'lastShown'>): Promise<void> {
  const previous = (await db.get('settings', 'reminder')) as ReminderConfig | undefined;
  await db.put('settings', { ...config, lastShown: previous?.lastShown }, 'reminder');
}

export async function saveSettings(db: DB, settings: Settings): Promise<void> {
  await db.put('settings', { ...settings }, SETTINGS_KEY);
}

// -------------------------------------------------------------- card sets

export async function listCardSets(db: DB): Promise<StoredCardSet[]> {
  return db.getAll('cardSets');
}

export async function getAllCardImages(db: DB): Promise<CardImage[]> {
  const rows = await db.getAll('cardImages');
  return rows.map((r) => ({ setId: r.setId, cardId: r.cardId, blob: new Blob([r.data], { type: r.type }) }));
}

/**
 * Saves a card set with its pictures, atomically: `images` holds the pictures
 * that are new or changed; pictures of cards no longer in the set are removed.
 */
export async function saveCardSet(db: DB, set: StoredCardSet, images: ReadonlyMap<string, Blob>): Promise<void> {
  // Read the pictures first: a transaction ends when it waits for anything else than IndexedDB.
  const pictures = await Promise.all([...images].map(async ([cardId, blob]) => ({ cardId, data: await blob.arrayBuffer(), type: blob.type })));
  const tx = db.transaction(['cardSets', 'cardImages'], 'readwrite');
  const imageStore = tx.objectStore('cardImages');
  const keep = new Set(set.cards.map((c) => c.id));
  const existing = await imageStore.index('bySet').getAllKeys(set.id);
  await Promise.all([
    tx.objectStore('cardSets').put(structuredClone(set)),
    ...existing.filter(([, cardId]) => !keep.has(cardId)).map((k) => imageStore.delete(k)),
    ...pictures.filter((p) => keep.has(p.cardId)).map((p) => imageStore.put({ setId: set.id, ...p })),
  ]);
  await tx.done;
}

/** Updates the texts of a card set (e.g. new translations), without touching its pictures. */
export async function saveCardSetTexts(db: DB, set: StoredCardSet): Promise<void> {
  await db.put('cardSets', structuredClone(set));
}

export async function deleteCardSet(db: DB, setId: string): Promise<void> {
  const tx = db.transaction(['cardSets', 'cardImages'], 'readwrite');
  const keys = await tx.objectStore('cardImages').index('bySet').getAllKeys(setId);
  await Promise.all([tx.objectStore('cardSets').delete(setId), ...keys.map((k) => tx.objectStore('cardImages').delete(k))]);
  await tx.done;
}
