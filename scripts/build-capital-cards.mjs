#!/usr/bin/env node
/**
 * Builds the cards of the "Capitals of the World" set: for every capital in
 * src/data/capitals.ts (taken from Flag Quiz), its four photos combined in one
 * image, 2 × 2, inside a black frame and separated by thin black lines:
 * public/cards/capitals/<code>.webp.
 *
 * The photos come from Flag Quiz (https://github.com/AOSSIE-Org/FlagQuiz),
 * at the commit pinned below; they are downloaded once into .cache/, or read
 * from a local checkout given as FLAGQUIZ_DIR=/path/to/FlagQuiz.
 * Authors and licences of every photo are listed in src/data/capitals.ts and
 * on the credits page.
 *
 * Usage: npm run build-capitals
 */
import { mkdir, readFile, rm, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'cards', 'capitals');
const CACHE = join(ROOT, '.cache', 'flagquiz');
/** Flag Quiz commit the photos and data were taken from. */
export const FLAGQUIZ_COMMIT = '9b9ac50';
const RAW = `https://raw.githubusercontent.com/AOSSIE-Org/FlagQuiz/${FLAGQUIZ_COMMIT}/public/`;

/** Size of each photo in the combined image, the black frame and the lines between photos (px). */
const PHOTO_W = 240;
const PHOTO_H = 160;
const FRAME = 8;
const LINE = 4;
export const CARD_W = 2 * FRAME + 2 * PHOTO_W + LINE;
export const CARD_H = 2 * FRAME + 2 * PHOTO_H + LINE;

async function readData(file) {
  const src = await readFile(join(ROOT, 'src', 'data', file), 'utf8');
  return JSON.parse(src.slice(src.indexOf('= [') + 2).replace(/;\s*$/, ''));
}

/** A photo of Flag Quiz (path like "capitals/fr-1.webp"), from a local checkout, the cache or GitHub. */
async function photo(src) {
  if (process.env.FLAGQUIZ_DIR) return readFile(join(process.env.FLAGQUIZ_DIR, 'public', src));
  const cached = join(CACHE, src);
  try {
    await access(cached);
    return readFile(cached);
  } catch {
    const res = await fetch(RAW + src);
    if (!res.ok) throw new Error(`${src}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await mkdir(dirname(cached), { recursive: true });
    await writeFile(cached, buf);
    return buf;
  }
}

const capitals = await readData('capitals.ts');
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const c of capitals) {
  const tiles = await Promise.all(
    c.photos.slice(0, 4).map((p) => photo(p.src).then((b) => sharp(b).resize(PHOTO_W, PHOTO_H, { fit: 'cover' }).toBuffer())),
  );
  const composite = tiles.map((input, i) => ({
    input,
    left: FRAME + (i % 2) * (PHOTO_W + LINE),
    top: FRAME + Math.floor(i / 2) * (PHOTO_H + LINE),
  }));
  await sharp({ create: { width: CARD_W, height: CARD_H, channels: 3, background: '#000000' } })
    .composite(composite)
    .webp({ quality: 72 })
    .toFile(join(OUT, `${c.code.toLowerCase()}.webp`));
}
console.log(`${capitals.length} capital cards (${CARD_W}×${CARD_H}) written to ${OUT}`);
