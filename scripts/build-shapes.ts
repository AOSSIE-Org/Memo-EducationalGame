#!/usr/bin/env node
/**
 * Writes the cards of the "2D Geometric Colored Shapes" set: one SVG per shape
 * and colour, in public/cards/shapes/<color>-<shape>.svg, drawn by
 * src/lib/shapes.ts (the same code draws the players' avatars).
 *
 * Usage: npm run build-shapes (Node 22.18+ runs TypeScript directly).
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLORS, COLOR_IDS, SHAPES, shapeCardId, shapeSvg } from '../src/lib/shapes.ts';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'cards', 'shapes');
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const color of COLOR_IDS) {
  for (const shape of SHAPES) {
    await writeFile(join(OUT, `${shapeCardId(color, shape)}.svg`), shapeSvg(shape, COLORS[color]));
  }
}
console.log(`${COLOR_IDS.length * SHAPES.length} shapes written to ${OUT}`);
