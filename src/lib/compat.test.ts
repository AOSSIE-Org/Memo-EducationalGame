/**
 * Files saved by every version of Memo must keep loading (see CONTRIBUTING).
 * Add a fixture of the current version before changing a format.
 */
import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { SET_VERSION, parseSetZip } from './setzip';
import { BACKUP_VERSION, EXPORT_VERSION, parseImportFile } from './transfer';

const fixtures = import.meta.glob<string>('./fixtures/*.json', { eager: true, query: '?raw', import: 'default' });
const versions = (prefix: string) =>
  Object.keys(fixtures)
    .map((p) => p.match(new RegExp(`/${prefix}-v(\\d+)\\.json$`))?.[1])
    .filter(Boolean)
    .map(Number);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

describe('saved data of every version', () => {
  it('has a fixture for every version', () => {
    for (let v = 1; v <= EXPORT_VERSION; v++) expect(versions('export')).toContain(v);
    for (let v = 1; v <= BACKUP_VERSION; v++) expect(versions('backup')).toContain(v);
    for (let v = 1; v <= SET_VERSION; v++) expect(versions('cardset')).toContain(v);
  });

  it.each(versions('export'))('loads player files of version %i', (v) => {
    const [p] = parseImportFile(fixtures[`./fixtures/export-v${v}.json`]);
    expect(p.user.name).toBe('Ana');
    expect(p.user.scores.shapes.pairs).toBe(14);
    expect(p.playDays).toHaveLength(2);
  });

  it.each(versions('backup'))('loads backups of version %i', (v) => {
    expect(parseImportFile(fixtures[`./fixtures/backup-v${v}.json`]).map((p) => p.user.name)).toEqual(['Ana', 'Bo']);
  });

  it.each(versions('cardset'))('loads card sets of version %i', (v) => {
    const zip = zipSync({
      'cardset.json': strToU8(fixtures[`./fixtures/cardset-v${v}.json`]),
      'images/001.png': PNG,
      'images/002.png': PNG,
      'images/003.png': PNG,
    });
    const { set } = parseSetZip(zip, 'en');
    expect(set.name.en).toBe('Fruits');
    expect(set.cards.map((c) => c.description.en)).toEqual(['Apple', 'Pear', 'Plum']);
    expect(set.auto).toEqual(['fr']);
  });
});
