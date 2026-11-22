#!/usr/bin/env node
/**
 * Writes the cards of the letter and number sets (src/lib/symbols.ts):
 * public/cards/latin/, public/cards/cyrillic/ and public/cards/numbers/.
 *
 * Usage: npm run build-symbols (Node 22.18+ runs TypeScript directly).
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CYRILLIC, DIGITS, LATIN, digitSvg, letterId, letterSvg } from '../src/lib/symbols.ts';

const CARDS = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'cards');
for (const [set, letters] of [['latin', LATIN], ['cyrillic', CYRILLIC]] as const) {
  await rm(join(CARDS, set), { recursive: true, force: true });
  await mkdir(join(CARDS, set), { recursive: true });
  for (const [i, l] of letters.entries()) await writeFile(join(CARDS, set, `${letterId(i)}.svg`), letterSvg(l, i));
}
await rm(join(CARDS, 'numbers'), { recursive: true, force: true });
await mkdir(join(CARDS, 'numbers'), { recursive: true });
for (const d of DIGITS) await writeFile(join(CARDS, 'numbers', `${d}.svg`), digitSvg(d));
console.log(`${LATIN.length + CYRILLIC.length + DIGITS.length} letter and number cards written`);
