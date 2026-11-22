import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import * as store from './db';
import type { StoredCardSet } from './cardsets';
import type { User } from './types';

let n = 0;
const fresh = () => store.openDatabase(`test-${++n}`);

const user: User = {
  name: 'Ana',
  avatar: { shape: 'heart', color: '#F472B6' },
  theme: 'light',
  scores: {},
  correctCount: 0,
  createdAt: 1,
  lastActiveAt: 1,
};

const set = (cards: string[]): StoredCardSet => ({
  id: 'c-x-1',
  language: 'en',
  name: { en: 'Fruits' },
  tags: [],
  cards: cards.map((id) => ({ id, description: { en: id } })),
  auto: [],
  createdAt: 1,
  updatedAt: 1,
});

describe('database', () => {
  it('saves players with their play days and deletes them together', async () => {
    const db = await fresh();
    const saved = await store.insertUserWithData(db, user, ['2026-11-21']);
    expect(await store.getPlayDays(db, saved.id!)).toEqual(['2026-11-21']);
    await store.deleteUserWithData(db, saved.id!);
    expect(await store.listUsers(db)).toEqual([]);
    expect(await store.getPlayDays(db, saved.id!)).toEqual([]);
  });

  it('saves card sets with their pictures and removes pictures of removed cards', async () => {
    const db = await fresh();
    const blob = new Blob(['x'], { type: 'image/png' });
    await store.saveCardSet(db, set(['a', 'b', 'c']), new Map([['a', blob], ['b', blob], ['c', blob]]));
    expect((await store.getAllCardImages(db)).map((i) => i.cardId).sort()).toEqual(['a', 'b', 'c']);
    await store.saveCardSet(db, set(['a', 'c', 'd']), new Map([['d', blob]]));
    expect((await store.getAllCardImages(db)).map((i) => i.cardId).sort()).toEqual(['a', 'c', 'd']);
    expect((await store.listCardSets(db))[0].cards.map((c) => c.id)).toEqual(['a', 'c', 'd']);
    await store.deleteCardSet(db, 'c-x-1');
    expect(await store.listCardSets(db)).toEqual([]);
    expect(await store.getAllCardImages(db)).toEqual([]);
  });

  it('keeps settings with defaults', async () => {
    const db = await fresh();
    const s = await store.getSettings(db);
    expect(s.pairs).toBe(6);
    expect(s.showSeconds).toBe(5);
    expect(s.turnRounds).toBe(3);
  });
});
