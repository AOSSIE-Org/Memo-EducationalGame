#!/usr/bin/env node
/**
 * Builds the photo card sets (fruits, minerals, animals…) from Wikipedia,
 * Wikidata and Wikimedia Commons:
 * - each card is an English Wikipedia article (curated below), resolved to
 *   its Wikidata item;
 * - names in every language of the app: the item's Wikidata labels (CC0),
 *   written to src/locales/cards/<lang>.json; labels missing in a language
 *   are listed in .cache/missing-labels.json, to be translated by hand into
 *   src/locales/cards-extra/<lang>.json (which also holds child-friendly
 *   overrides);
 * - the photo: PHOTOS below if set (chosen by hand after review), else the
 *   item's image (P18), else the article's lead image; resized and cropped
 *   to a square (centred on the most interesting part) in
 *   public/cards/<set>/<id>.webp;
 * - author, licence and source of every photo in src/data/photoSets.ts (and
 *   on the credits page). Photos that aren't freely licensed are skipped.
 *
 * Usage: npm run fetch-photo-sets   (then npm run build-credits)
 * Needs network access. Downloads are cached in .cache/commons.
 */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.cache', 'commons');
const UA = 'MemoDataBuilder/1.0 (https://github.com/AOSSIE-Org/Memo-EducationalGame)';
const SIZE = 320;

/** Card sets: id → English Wikipedia articles, one per card. */
export const SETS = {
  commonFruits: [
    'Apple', 'Banana', 'Orange (fruit)', 'Grape', 'Strawberry', 'Pear', 'Peach', 'Cherry', 'Watermelon',
    'Pineapple', 'Mango', 'Lemon', 'Kiwifruit', 'Plum', 'Apricot', 'Blueberry', 'Raspberry', 'Coconut',
    'Papaya', 'Pomegranate', 'Common fig', 'Melon', 'Lime (fruit)', 'Grapefruit', 'Avocado', 'Blackberry',
    'Tangerine',
  ],
  rareFruits: [
    'Durian', 'Rambutan', 'Purple mangosteen', 'Pitaya', 'Lychee', 'Longan', 'Jackfruit', 'Carambola',
    'Passiflora edulis', 'Guava', 'Japanese persimmon', 'Kumquat', 'Feijoa', 'Cherimoya', 'Salak', 'Soursop',
    'Cucumis metuliferus', 'Jabuticaba', 'Quince', 'Mespilus germanica', 'Physalis peruviana', 'Tamarillo',
    'Loquat', 'Manilkara zapota', "Buddha's hand", 'Ackee', 'Breadfruit',
  ],
  minerals: [
    'Quartz', 'Amethyst', 'Pyrite', 'Calcite', 'Fluorite', 'Malachite', 'Azurite', 'Gypsum', 'Halite',
    'Muscovite', 'Orthoclase', 'Magnetite', 'Hematite', 'Galena', 'Sulfur', 'Gold', 'Native copper', 'Diamond',
    'Beryl', 'Corundum', 'Topaz', 'Garnet', 'Turquoise', 'Talc', 'Graphite', 'Tourmaline', 'Opal',
    'Rhodochrosite', 'Vanadinite', 'Celestine (mineral)',
  ],
  insects: [
    'Western honey bee', 'Coccinellidae', 'Monarch butterfly', 'Dragonfly', 'Ant', 'Grasshopper', 'Housefly',
    'Mantis', 'Lucanus cervus', 'Firefly', 'Cricket (insect)', 'Wasp', 'Bumblebee', 'Cicada', 'Actias luna',
    'Phasmatodea', 'Papilio machaon', 'Damselfly', 'Dynastinae', 'Mosquito', 'Aphid', 'Termite', 'Cockroach',
    'Aglais io',
  ],
  mammals: [
    'Lion', 'Tiger', 'African bush elephant', 'Giraffe', 'Zebra', 'Brown bear', 'Polar bear', 'Giant panda',
    'Red kangaroo', 'Koala', 'Chimpanzee', 'Gorilla', 'Wolf', 'Red fox', 'Red deer', 'European rabbit',
    'Red squirrel', 'European hedgehog', 'Megabat', 'Common bottlenose dolphin', 'Humpback whale',
    'Hippopotamus', 'White rhinoceros', 'Dromedary', 'Cheetah', 'Leopard', 'Sea otter', 'Raccoon', 'Sloth',
    'Moose', 'Orangutan', 'Meerkat', 'Snow leopard', 'Platypus',
  ],
  birds: [
    'Bald eagle', 'Barn owl', 'Scarlet macaw', 'Emperor penguin', 'American flamingo', 'Indian peafowl',
    'Common ostrich', 'Ruby-throated hummingbird', 'Toco toucan', 'Mute swan', 'Brown pelican',
    'Common kingfisher', 'European robin', 'House sparrow', 'Rock dove', 'Common raven',
    'Great spotted woodpecker', 'European herring gull', 'White stork', 'Atlantic puffin', 'Great hornbill',
    'Kiwi (bird)', 'Grey heron', 'Northern cardinal', 'Blue jay', 'Secretarybird', 'Snowy owl',
  ],
  farmAnimals: [
    'Cattle', 'Domestic pig', 'Sheep', 'Goat', 'Horse', 'Donkey', 'Chicken', 'Domestic duck', 'Domestic goose',
    'Domestic turkey', 'Domestic rabbit', 'Llama', 'Alpaca', 'Water buffalo', 'Domestic yak',
    'Guinea pig', 'Mule',
  ],
  reptiles: [
    'Saltwater crocodile', 'American alligator', 'Green sea turtle', 'Galápagos tortoise', 'Panther chameleon',
    'Green iguana', 'Tokay gecko', 'Komodo dragon', 'King cobra', 'Ball python',
    'Western diamondback rattlesnake', 'Frilled lizard', 'Gila monster', 'Tuatara', 'Gharial',
    'Central bearded dragon', 'Thorny devil', 'Green anaconda', 'Marine iguana', 'Common box turtle',
  ],
  fish: [
    'Ocellaris clownfish', 'Goldfish', 'Great white shark', 'Atlantic salmon', 'Atlantic bluefin tuna',
    'Seahorse', 'Tetraodontidae', 'Pterophyllum', 'Swordfish', 'Common carp', 'Rainbow trout',
    'Giant oceanic manta ray', 'Red-bellied piranha', 'Atlantic cod', 'European pilchard',
    'Siamese fighting fish', 'Mandarinfish', 'Red lionfish', 'Ocean sunfish', 'Great hammerhead',
    'Whale shark', 'Moorish idol', 'Paracanthurus', 'Koi',
  ],
  amphibians: [
    'Common frog', 'Common toad', 'Agalychnis callidryas', 'Strawberry poison-dart frog', 'Axolotl',
    'Fire salamander', 'Northern crested newt', 'American bullfrog', 'Glass frog', 'Dyscophus antongilii',
    'Ceratophrys ornata', 'Olm', 'Japanese giant salamander', 'Cane toad', 'Smooth newt', 'Tiger salamander',
    "Wallace's flying frog", 'Golden poison frog', 'European tree frog',
  ],
};

/** Photos chosen by hand (Commons file names) where the default one isn't a good card for children. */
const PHOTOS = JSON.parse(await readFile(join(ROOT, 'scripts', 'photo-choices.json'), 'utf8').catch(() => '{}'));

/** Wikidata label languages for each app language, best first. */
const LABEL_LANGS = { zh: ['zh-hans', 'zh-cn', 'zh'], yue: ['yue', 'zh-hk', 'zh-hant', 'zh-tw'], fil: ['tl', 'fil'], nb: ['nb', 'no', 'nn'], ms: ['ms'], sr: ['sr-ec', 'sr'], uz: ['uz-latn', 'uz'], kk: ['kk-cyrl', 'kk'] };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** fetch, retried after network errors. */
async function get(url, init = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, { ...init, headers: { 'User-Agent': UA } });
    } catch (err) {
      if (attempt >= 5) throw err;
      await sleep(2000 * (attempt + 1));
    }
  }
}
async function api(url, params) {
  const body = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await get(url, { method: 'POST', body });
      if (res.status === 429 && attempt < 6) {
        await sleep(1000 * (Number(res.headers.get('retry-after')) || 5));
        continue;
      }
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt >= 6) throw err;
      await sleep(3000 * (attempt + 1));
    }
  }
}
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
export const slugOf = (title) =>
  title.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

const stripHtml = (s = '') => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
/** Wikidata labels without disambiguation in brackets, and capitalised. */
function cleanLabel(s, lang) {
  const clean = s.replace(/\s*[(（][^)）]*[)）]\s*$/, '').trim();
  // Georgian has no capital letters in normal text (Mtavruli is for headings only).
  if (lang === 'ka') return clean;
  return clean.charAt(0).toLocaleUpperCase(lang) + clean.slice(1);
}

async function main() {
  const { LANGUAGES } = await import('../src/lib/languages.ts');
  const items = Object.entries(SETS).flatMap(([set, titles]) => titles.map((title) => ({ set, title, id: slugOf(title) })));

  // 1. Articles → Wikidata items and lead images.
  for (const batch of chunks(items, 50)) {
    const r = await api('https://en.wikipedia.org/w/api.php', {
      action: 'query', prop: 'pageprops|pageimages', piprop: 'name', ppprop: 'wikibase_item', redirects: '1',
      titles: batch.map((i) => i.title).join('|'),
    });
    const redirect = new Map((r.query.redirects ?? []).map((x) => [x.from, x.to]));
    const normal = new Map((r.query.normalized ?? []).map((x) => [x.from, x.to]));
    for (const it of batch) {
      const t = redirect.get(normal.get(it.title) ?? it.title) ?? normal.get(it.title) ?? it.title;
      const page = r.query.pages.find((p) => p.title === t);
      if (!page?.pageprops?.wikibase_item) throw new Error(`No Wikidata item for ${it.title}`);
      it.qid = page.pageprops.wikibase_item;
      it.leadImage = page.pageimage;
    }
  }

  // 2. Labels and images from Wikidata.
  const wanted = [...new Set(['en', ...LANGUAGES.flatMap((l) => LABEL_LANGS[l.code] ?? [l.code])])];
  for (const batch of chunks(items, 20)) {
    const ids = batch.map((i) => i.qid).join('|');
    const claims = await api('https://www.wikidata.org/w/api.php', { action: 'wbgetentities', ids, props: 'claims' });
    for (const it of batch) {
      const c = claims.entities[it.qid].claims?.P18;
      it.p18 = (c?.find((x) => x.rank === 'preferred') ?? c?.[0])?.mainsnak.datavalue?.value;
      it.labels = {};
    }
    // At most 50 languages per request.
    for (const langs of chunks(wanted, 50)) {
      const r = await api('https://www.wikidata.org/w/api.php', { action: 'wbgetentities', ids, props: 'labels', languages: langs.join('|') });
      if (!r.entities) throw new Error(JSON.stringify(r.error));
      for (const it of batch) for (const [k, v] of Object.entries(r.entities[it.qid].labels ?? {})) it.labels[k] = v.value;
    }
  }

  // 3. Photos: licence and a thumbnail.
  for (const it of items) it.file = (PHOTOS[`${it.set}/${it.id}`] ?? it.p18 ?? it.leadImage)?.replace(/^File:/, '').replace(/_/g, ' ');
  const info = new Map();
  for (const batch of chunks([...new Set(items.map((i) => i.file).filter(Boolean))], 50)) {
    const r = await api('https://commons.wikimedia.org/w/api.php', {
      action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '500', titles: batch.map((f) => `File:${f}`).join('|'),
    });
    const normal = new Map((r.query.normalized ?? []).map((x) => [x.to, x.from]));
    for (const p of r.query.pages) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const m = ii.extmetadata ?? {};
      info.set((normal.get(p.title) ?? p.title).replace(/^File:/, ''), {
        thumb: ii.thumburl, source: ii.descriptionurl,
        license: stripHtml(m.LicenseShortName?.value), licenseUrl: m.LicenseUrl?.value,
        author: stripHtml(m.Artist?.value) || 'Unknown', nonFree: m.NonFree?.value === 'true',
      });
    }
  }

  const out = {};
  const missing = {};
  for (const it of items) {
    const i = info.get(it.file);
    if (!i || i.nonFree || !/^(CC|Public domain|PD|GFDL|FAL|Attribution)/i.test(i.license)) {
      console.warn(`No free photo for ${it.set}/${it.id} (${it.file ?? 'none'}: ${i?.license ?? 'no info'})`);
      continue;
    }
    const cached = join(CACHE, encodeURIComponent(it.file));
    let buf;
    try {
      await access(cached);
      buf = await readFile(cached);
    } catch {
      for (let attempt = 0; ; attempt++) {
        try {
          const res = await get(i.thumb);
          if (res.status === 429 && attempt < 6) { await sleep(1000 * (Number(res.headers.get('retry-after')) || 5)); continue; }
          if (!res.ok) throw new Error(`${it.file}: HTTP ${res.status}`);
          buf = Buffer.from(await res.arrayBuffer());
          break;
        } catch (err) {
          if (attempt >= 6) throw err;
          await sleep(3000 * (attempt + 1));
        }
      }
      await mkdir(CACHE, { recursive: true });
      await writeFile(cached, buf);
      await sleep(200);
    }
    const dir = join(ROOT, 'public', 'cards', it.set);
    await mkdir(dir, { recursive: true });
    // Square cards: cropped around the subject, but very wide or tall photos (often several fruits
    // side by side, or a long fish) are shown whole on white, so that nothing important is cut off.
    const meta = await sharp(buf).rotate().metadata();
    const ratio = (meta.autoOrient?.width ?? meta.width) / (meta.autoOrient?.height ?? meta.height);
    const fit = ratio > 1.45 || ratio < 0.69 ? { fit: 'contain', background: '#ffffff' } : { fit: 'cover', position: sharp.strategy.attention };
    await sharp(buf).rotate().flatten({ background: '#ffffff' }).resize(SIZE, SIZE, fit).webp({ quality: 74 }).toFile(join(dir, `${it.id}.webp`));
    (out[it.set] ??= []).push({
      id: it.id, wikidata: it.qid, article: it.title, title: it.file.replace(/\.[a-z]+$/i, ''),
      author: i.author.slice(0, 200), license: i.license, licenseUrl: i.licenseUrl, source: i.source,
    });
    // Names.
    for (const { code } of LANGUAGES) {
      const label = (LABEL_LANGS[code] ?? [code]).map((l) => it.labels[l]).find(Boolean);
      if (label) ((it.names ??= {})[code] = cleanLabel(label, code));
      else (missing[code] ??= {})[`${it.set}.${it.id}`] = it.labels.en ?? it.title;
    }
  }

  // Generated files.
  const header = `// Generated by scripts/fetch-photo-sets.mjs on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand.
// Cards: English Wikipedia articles and their Wikidata items (CC0). Photos: Wikimedia Commons, under the
// licences listed below and on the credits page.
`;
  await writeFile(
    join(ROOT, 'src', 'data', 'photoSets.ts'),
    `${header}
export interface PhotoCard {
  id: string;
  wikidata: string;
  article: string;
  /** Commons file name of the photo (without extension). */
  title: string;
  author: string;
  license: string;
  licenseUrl?: string;
  source: string;
}

export const PHOTO_SETS: Record<string, PhotoCard[]> = ${JSON.stringify(out, null, 2)};
`,
  );
  const namesDir = join(ROOT, 'src', 'locales', 'cards');
  await mkdir(namesDir, { recursive: true });
  for (const { code } of LANGUAGES) {
    const names = {};
    for (const it of items) if (it.names?.[code]) names[`${it.set}.${it.id}`] = it.names[code];
    await writeFile(join(namesDir, `${code}.json`), JSON.stringify(names, null, 1) + '\n');
  }
  await mkdir(join(ROOT, '.cache'), { recursive: true });
  await writeFile(join(ROOT, '.cache', 'missing-labels.json'), JSON.stringify(missing, null, 1));
  console.log(`${items.length} cards; missing labels:`, Object.fromEntries(Object.entries(missing).map(([k, v]) => [k, Object.keys(v).length])));
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
