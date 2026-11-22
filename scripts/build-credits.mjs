#!/usr/bin/env node
/**
 * Builds public/credits.html, the app's credits page (data sources, photo
 * authors and licences, and how to support AOSSIE), from src/data/capitals.ts.
 * Styled according to AOSSIE's brand guidelines.
 *
 * The page is written in English; public/credits-i18n/<lang>.json holds its
 * texts and names in every other language of the app, and a small script in
 * the page applies them when the page is opened as credits.html#<lang> (the
 * app links to it that way). Texts come from the 'credits.*' messages of
 * src/locales, names from src/locales/names.
 *
 * Usage: npm run build-credits
 * Needs Node 22.18+ (imports the messages from TypeScript).
 */
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'credits.html');
const I18N_DIR = join(ROOT, 'public', 'credits-i18n');
const FONT = 'inter-latin-wght-normal.woff2';
export const DONATE_URL = 'https://buymeacoffee.com/aossie';

/** Reads the exported array of a generated data module. */
async function readPhotoSets() {
  const src = await readFile(join(ROOT, 'src', 'data', 'photoSets.ts'), 'utf8');
  return JSON.parse(src.slice(src.indexOf('PHOTO_SETS: Record<string, PhotoCard[]> = ') + 42).replace(/;\s*$/, ''));
}

async function readData(file) {
  const src = await readFile(join(ROOT, 'src', 'data', file), 'utf8');
  return JSON.parse(src.slice(src.indexOf('= [') + 2).replace(/;\s*$/, ''));
}

const esc = (s = '') =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Links that the {placeholders} of the 'credits.*' messages stand for. */
const LINKS = {
  aossie: '<a href="https://aossie.org/">AOSSIE</a>',
  link: '<a href="https://github.com/AOSSIE-Org/Memo-EducationalGame">github.com/AOSSIE-Org/Memo-EducationalGame</a>',
  flagquiz: '<a href="https://github.com/AOSSIE-Org/FlagQuiz">Flag Quiz</a>',
  cldr: '<a href="https://cldr.unicode.org/">Unicode CLDR</a>',
  wikidata: '<a href="https://www.wikidata.org/">Wikidata</a>',
  commons: '<a href="https://commons.wikimedia.org/">Wikimedia Commons</a>',
  via: '<a href="https://github.com/topojson/world-atlas">world-atlas</a>',
};
/** Placeholders whose link depends on the message. */
const MESSAGE_LINKS = {
  'credits.names': { licence: '<a href="https://www.unicode.org/license.txt">Unicode License v3</a>' },
  'credits.flags': { source: '<a href="https://github.com/hampusborgos/country-flags">hampusborgos/country-flags</a>' },
  'credits.photoSets': { wikipedia: '<a href="https://www.wikipedia.org/">Wikipedia</a>' },
};
const TEXT_KEYS = ['credits.donateTitle', 'credits.donateButton', 'credits.data', 'credits.photos', 'credits.otherPhotos', 'madeBy'];
const HTML_KEYS = [
  'credits.lead',
  'credits.source',
  'credits.donateText',
  'credits.shapes',
  'credits.photoSets',
  'credits.flags',
  'credits.capitals',
  'credits.names',
  'credits.photosNote',
];

/** A message as HTML: text escaped, {placeholders} replaced by their links. */
function render(messages, key) {
  const links = { ...LINKS, ...MESSAGE_LINKS[key] };
  return esc(messages[key]).replace(/\{(\w+)\}/g, (m, name) => links[name] ?? m);
}

export async function buildCredits() {
  const { LANGUAGES } = await import('../src/lib/languages.ts');
  const english = (await import('../src/locales/en.ts')).default;
  const t = (key) => (HTML_KEYS.includes(key) ? render(english, key) : esc(english[key]));
  const capitals = await readData('capitals.ts');
  const enNames = JSON.parse(await readFile(join(ROOT, 'src', 'locales', 'names', 'en.json'), 'utf8'));

  // Inter, bundled so the page works offline too.
  await mkdir(join(ROOT, 'public', 'fonts'), { recursive: true });
  await copyFile(join(ROOT, 'node_modules', '@fontsource-variable', 'inter', 'files', FONT), join(ROOT, 'public', 'fonts', FONT));

  const cards = capitals
    .map((c) => {
      const photos = c.photos
        .map(
          (p) => `
        <li><a href="${esc(p.source)}">${esc(p.title)}</a><span title="© ${esc(p.author)}">© ${esc(p.author)} · ${
            p.licenseUrl ? `<a href="${esc(p.licenseUrl)}">${esc(p.license)}</a>` : esc(p.license)
          }</span></li>`,
        )
        .join('');
      return `
    <article class="card">
      <h3><span data-capital="${c.code}">${esc(enNames.capitals[c.code] ?? c.name)}</span> <small data-country="${c.code}">${esc(enNames.countries[c.code] ?? c.code)}</small></h3>
      <img class="combined" src="cards/capitals/${c.code.toLowerCase()}.webp" alt="" loading="lazy" width="500" height="340" />
      <ol class="photos">${photos}
      </ol>
    </article>`;
    })
    .join('');

  // Photos of the other photo sets (fruits, animals, minerals), one card per photo.
  const photoSets = await readPhotoSets();
  const enCards = { ...JSON.parse(await readFile(join(ROOT, 'src', 'locales', 'cards', 'en.json'), 'utf8')), ...JSON.parse(await readFile(join(ROOT, 'src', 'locales', 'cards-extra', 'en.json'), 'utf8')) };
  const otherPhotos = Object.entries(photoSets)
    .flatMap(([set, cards]) =>
      cards.map(
        (p) => `
    <article class="card small">
      <img class="combined" src="cards/${set}/${p.id}.webp" alt="" loading="lazy" width="320" height="320" />
      <h3 data-card="${set}.${p.id}">${esc(enCards[`${set}.${p.id}`] ?? p.article)}</h3>
      <p class="photos"><a href="${esc(p.source)}">${esc(p.title)}</a><span title="© ${esc(p.author)}">© ${esc(p.author)} · ${
        p.licenseUrl ? `<a href="${esc(p.licenseUrl)}">${esc(p.license)}</a>` : esc(p.license)
      }</span></p>
    </article>`,
      ),
    )
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Memo</title>
<link rel="icon" href="memo-logo.svg" type="image/svg+xml" />
<style>
  @font-face {
    font-family: 'Inter';
    src: url('fonts/${FONT}') format('woff2');
    font-weight: 100 900;
    font-display: swap;
  }
  /* AOSSIE brand: Golden Wallet, Baggy Green, dark #121212, white, muted grey. */
  :root {
    --gold: #ffcd00;
    --green: #00843d;
    --ink: #121212;
    --grey: #7a7a7a;
    --bg: #ffffff;
    --surface: #f5f5f5;
    --text: var(--ink);
    --border: #e4e4e4;
    --link: var(--green);
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: var(--ink);
      --surface: #1e1e1e;
      --text: #ffffff;
      --border: #333333;
      --link: var(--gold);
      color-scheme: dark;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
    font-size: 18px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  a { color: var(--link); text-decoration-thickness: 1px; text-underline-offset: 2px; }
  main { max-width: 1040px; margin: 0 auto; padding: 32px 20px 48px; }
  header { display: flex; align-items: center; gap: 18px; margin-bottom: 8px; }
  header img { width: 72px; height: 72px; }
  h1 { margin: 0; font-size: clamp(36px, 6vw, 48px); font-weight: 800; letter-spacing: -0.02em; }
  h2 {
    margin: 40px 0 14px;
    font-size: 28px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  h2::before { content: ''; width: 6px; height: 1.1em; border-radius: 3px; background: var(--green); }
  .lead { font-size: 20px; margin: 16px 0 4px; }
  .donate {
    margin: 28px 0 8px;
    padding: 24px 26px;
    border-radius: 18px;
    background: linear-gradient(135deg, rgb(255 205 0 / 0.22), rgb(0 132 61 / 0.14));
    border: 2px solid var(--gold);
  }
  .donate h2 { margin: 0 0 8px; }
  .donate h2::before { background: var(--gold); }
  .donate p { margin: 0 0 16px; }
  .button {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 22px;
    border-radius: 999px;
    background: var(--gold);
    color: var(--ink);
    font-weight: 700;
    font-size: 17px;
    text-decoration: none;
    box-shadow: 0 6px 18px rgb(255 205 0 / 0.35);
    transition: transform 0.12s ease;
  }
  .button:hover { transform: translateY(-2px); }
  .data { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
  .data li { padding: 12px 16px; border-radius: 12px; background: var(--surface); }
  .note { color: var(--grey); font-size: 15px; }
  .cards:has(.small) { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
  .card.small h3 { margin: 8px 0 4px; font-size: 15px; }
  .card.small .photos { display: grid; grid-template-columns: 1fr; padding: 0; margin: 0; }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
  .card { padding: 14px; border-radius: 16px; background: var(--surface); border: 1px solid var(--border); }
  .card h3 { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 0 0 10px; font-size: 18px; }
  .card h3 small { color: var(--grey); font-weight: 500; font-size: 14px; }
  .combined { display: block; width: 100%; height: auto; border-radius: 8px; }
  .photos { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; margin: 8px 0 0; padding-inline-start: 1.2em; font-size: 12px; line-height: 1.35; }
  .photos li { min-width: 0; }
  .photos li > a:first-child { display: block; font-weight: 600; color: var(--text); text-decoration: none; }
  /* Some authors' notices are long: three lines, full text on hover and on the photo's page. */
  .photos span {
    color: var(--grey);
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
  }
  footer { margin-top: 48px; display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--grey); font-size: 15px; }
  footer img { height: 40px; width: auto; }
</style>
</head>
<body>
<main>
  <header>
    <img src="memo-logo.svg" alt="" />
    <h1>Memo</h1>
  </header>

  <p class="lead" data-i18n="credits.lead">${t('credits.lead')}</p>
  <p data-i18n="credits.source">${t('credits.source')}</p>

  <section class="donate">
    <h2 data-i18n="credits.donateTitle">${t('credits.donateTitle')}</h2>
    <p data-i18n="credits.donateText">${t('credits.donateText')}</p>
    <a class="button" href="${DONATE_URL}" target="_blank" rel="noopener">☕ <span data-i18n="credits.donateButton">${t('credits.donateButton')}</span></a>
  </section>

  <h2 data-i18n="credits.data">${t('credits.data')}</h2>
  <ul class="data">
    <li data-i18n="credits.shapes">${t('credits.shapes')}</li>
    <li data-i18n="credits.photoSets">${t('credits.photoSets')}</li>
    <li data-i18n="credits.flags">${t('credits.flags')}</li>
    <li data-i18n="credits.capitals">${t('credits.capitals')}</li>
    <li data-i18n="credits.names">${t('credits.names')}</li>
  </ul>

  <h2 data-i18n="credits.otherPhotos">${t('credits.otherPhotos')}</h2>
  <div class="cards">${otherPhotos}
  </div>

  <h2 data-i18n="credits.photos">${t('credits.photos')}</h2>
  <p class="note" data-i18n="credits.photosNote">${t('credits.photosNote')}</p>
  <div class="cards">${cards}
  </div>

  <footer>
    <span data-i18n="madeBy">${t('madeBy')}</span>
    <a href="https://aossie.org/"><img src="brand/aossie-secondary.svg" alt="AOSSIE" /></a>
  </footer>
</main>
<script>
  // Translation: credits.html#<lang> (see scripts/build-credits.mjs).
  (function () {
    function apply() {
      var lang = location.hash.slice(1);
      if (!/^[a-z]{2,3}$/.test(lang) || lang === 'en') return;
      fetch('credits-i18n/' + lang + '.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d) return;
          document.documentElement.lang = d.lang;
          document.documentElement.dir = d.dir;
          document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (d.html[key] !== undefined) el.innerHTML = d.html[key];
            else if (d.text[key] !== undefined) el.textContent = d.text[key];
          });
          document.querySelectorAll('[data-capital]').forEach(function (el) {
            var n = d.capitals[el.getAttribute('data-capital')];
            if (n) el.textContent = n;
          });
          document.querySelectorAll('[data-card]').forEach(function (el) {
            var n = d.cards && d.cards[el.getAttribute('data-card')];
            if (n) el.textContent = n;
          });
          document.querySelectorAll('[data-country]').forEach(function (el) {
            var n = d.countries[el.getAttribute('data-country')];
            if (n) el.textContent = n;
          });
        })
        .catch(function () {});
    }
    apply();
    addEventListener('hashchange', function () { location.reload(); });
  })();
</script>
</body>
</html>
`;
  await writeFile(OUT, html);

  // Translations of the page.
  await rm(I18N_DIR, { recursive: true, force: true });
  await mkdir(I18N_DIR, { recursive: true });
  for (const lang of LANGUAGES) {
    if (lang.code === 'en') continue;
    const messages = { ...english, ...(await import(`../src/locales/${lang.code}.ts`)).default };
    const names = JSON.parse(await readFile(join(ROOT, 'src', 'locales', 'names', `${lang.code}.json`), 'utf8'));
    const data = {
      lang: lang.code,
      dir: lang.dir,
      text: Object.fromEntries(TEXT_KEYS.map((k) => [k, messages[k]])),
      html: Object.fromEntries(HTML_KEYS.map((k) => [k, render(messages, k)])),
      capitals: Object.fromEntries(capitals.map((c) => [c.code, names.capitals[c.code]])),
      countries: Object.fromEntries(capitals.map((c) => [c.code, names.countries[c.code]])),
      cards: {
        ...JSON.parse(await readFile(join(ROOT, 'src', 'locales', 'cards', `${lang.code}.json`), 'utf8')),
        ...JSON.parse(await readFile(join(ROOT, 'src', 'locales', 'cards-extra', `${lang.code}.json`), 'utf8').catch(() => '{}')),
      },
    };
    await writeFile(join(I18N_DIR, `${lang.code}.json`), JSON.stringify(data));
  }
  return OUT;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`Wrote ${await buildCredits()}`);
}
