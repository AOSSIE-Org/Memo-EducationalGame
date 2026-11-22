import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { StoredCardSet } from './cardsets';
import { buildSetZip, parseSetZip, SetImportError, sniffImage } from './setzip';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function zip(data: unknown, images: Record<string, Uint8Array> = {}) {
  return zipSync({ 'cardset.json': strToU8(JSON.stringify(data)), ...images });
}

const reason = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof SetImportError ? e.reason : 'other';
  }
  return 'none';
};

describe('card set zip files', () => {
  it('round-trips a set with a new local id', async () => {
    const set: StoredCardSet = {
      id: 'c-1-abc',
      language: 'en',
      name: { en: 'Fruits', fr: 'Fruits' },
      tags: [{ en: 'Food' }],
      cards: ['k1', 'k2', 'k3'].map((id, i) => ({ id, description: { en: `Fruit ${i}` } })),
      auto: ['fr'],
      createdAt: 1,
      updatedAt: 1,
    };
    const images = new Map(set.cards.map((c) => [c.id, new Blob([PNG], { type: 'image/png' })]));
    const parsed = parseSetZip(await buildSetZip(set, images), 'de');
    expect(parsed.set.id).not.toBe(set.id);
    expect(parsed.set.name).toEqual(set.name);
    expect(parsed.set.tags).toEqual(set.tags);
    expect(parsed.set.auto).toEqual(['fr']);
    expect(parsed.set.cards.map((c) => c.description.en)).toEqual(['Fruit 0', 'Fruit 1', 'Fruit 2']);
    expect([...parsed.images.values()].every((i) => i.type === 'image/png')).toBe(true);
  });

  it('accepts plain strings in the language of the app, cut to the limits', () => {
    const data = {
      format: 'memo-card-set',
      version: 1,
      name: 'A very very very very very long name of a set',
      cards: [1, 2, 3].map((i) => ({ image: `${i}.png`, description: `Card ${i}` })),
    };
    const parsed = parseSetZip(zip(data, { '1.png': PNG, '2.png': PNG, '3.png': PNG }), 'fr');
    expect(parsed.set.language).toBe('fr');
    expect([...parsed.set.name.fr!].length).toBeLessThanOrEqual(32);
  });

  it('rejects files that are not card sets', () => {
    expect(reason(() => parseSetZip(strToU8('hello'), 'en'))).toBe('notZip');
    expect(reason(() => parseSetZip(zipSync({ 'x.txt': strToU8('x') }), 'en'))).toBe('noData');
    expect(reason(() => parseSetZip(zip({ format: 'other' }), 'en'))).toBe('invalid');
    expect(reason(() => parseSetZip(zip({ format: 'memo-card-set', version: 99 }), 'en'))).toBe('unsupportedVersion');
    // Files that only pretend to be pictures are skipped.
    const fake = { format: 'memo-card-set', version: 1, name: 'x', cards: [1, 2, 3].map((i) => ({ image: `${i}.png` })) };
    expect(reason(() => parseSetZip(zip(fake, { '1.png': strToU8('<script>'), '2.png': PNG, '3.png': PNG }), 'en'))).toBe('tooFewCards');
  });

  it('recognises pictures by their content', () => {
    expect(sniffImage(PNG)).toBe('image/png');
    expect(sniffImage(strToU8('<?xml version="1.0"?><svg></svg>'))).toBe('image/svg+xml');
    expect(sniffImage(strToU8('hello'))).toBeNull();
  });
});
