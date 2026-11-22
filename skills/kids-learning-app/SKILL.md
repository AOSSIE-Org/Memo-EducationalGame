---
name: kids-learning-app
description: Plan, build, verify and ship a small, purely local educational web game for young children (e.g. learning flags, capitals, maps, animals, letters, numbers, shapes, colours) with AOSSIE's stack and conventions — Svelte 5 + TypeScript + Vite, IndexedDB storage, offline PWA that also works as a plain static site and installs on phones, AOSSIE branding, icon-first minimal UI that fits one screen without scrolling, multilingual (every language browsers can speak and the CLDR names countries in — 77 in Flag Quiz — i18n with right-to-left support), spoken prompts in the chosen language, safe updates that never lose players' progress, multiple players and multiplayer turns, adaptive difficulty, streaks and statistics, JSON export/import, grown-ups-only deletion, credits and donation pages, social sharing metadata, the AOSSIE Template-Repo with every TODO and checklist filled, CI and GitHub Pages deployment. Use when asked to create a new learning app, quiz or game for kids, or to extend one built this way.
compatibility: Needs Node.js 20+, npm, git, the GitHub CLI (gh) and network access (template repo, brand assets, open data). playwright-core with the system Chrome and Playwright's WebKit build (`npx playwright install webkit`) is required for verification in both browser engines.
metadata:
  version: "1.6"
  category: app-generation
  origin: Distilled from building Flag Quiz (https://github.com/AOSSIE-Org/FlagQuiz); the full conversation is in prompts/1.md of that repo.
user-invocable: true
---

# Kids Learning App

## Purpose

Build a small educational game for young children that runs entirely in the
browser, stores everything locally, works offline, installs on phones, and
follows AOSSIE's branding and repository conventions. The reference
implementation is **Flag Quiz** (this repository): reuse its structure and code
wherever the new subject allows.

Read [references/architecture.md](references/architecture.md) before writing
code. It has the module layout, data model, algorithms, data pipelines, and the
pitfalls that cost time while building Flag Quiz.

## Requirements

Apply all of these unless the user explicitly says otherwise. They are what the
user asked for, or corrected, while building Flag Quiz.

### Locality and privacy
- No backend, no accounts, no analytics, no runtime requests to other
  origins. Fonts, icons, images, map and data are bundled and served from the
  app's own origin.
- All data lives in IndexedDB (via `idb`): players, per-item statistics, play
  days and device-wide settings. The app must still run if IndexedDB is
  unavailable (just without saving).
- Relative base (`base: './'`): `dist/` works from any static host and folder.
- PWA (`vite-plugin-pwa`): **everything is precached at install, photos
  included**, so every game works offline. The service worker registers only
  where supported, so the same build also works as a plain static site.
- Ask for persistent storage (`navigator.storage.persist()`) when a player
  starts playing, so the browser doesn't evict the data (Safari deletes data
  of sites not on the home screen after 7 days without use).

### Daily reminder notification (the user's choices)
- A daily notification reminding the child to keep their streak, **without
  any third-party or push service and without a server** (so no Web Push,
  no FCM/APNs, no OneSignal…). Use **Periodic Background Sync**: the app
  registers a sync (`minInterval` 12 h); the browser wakes the service worker
  (a file added with `workbox.importScripts`), which reads IndexedDB and shows
  a local notification only if the reminder is on, there is a player, nobody
  has played today, it's afternoon (≥ 15:00) and none was shown today.
  Tapping it opens/focuses the app. The text, in the app's language, is
  written by the app to IndexedDB (`settings` store, key `reminder`) and
  rewritten when the language changes.
- The service worker must open the database **without a version** and abort
  `onupgradeneeded`, so it never creates an empty database the app would
  then fail to upgrade.
- A menu toggle (🔔/🔕, `menuitemcheckbox`) **only when the app is installed
  as a PWA and the browser supports it** (`display-mode: standalone|fullscreen`
  and `'periodicSync' in ServiceWorkerRegistration.prototype` — Chromium
  browsers). Switching on asks for notification permission from the tap; if
  it's refused, show the item in red with "notifications are blocked".
  Safari/iOS and Firefox can't do this without a push server: hide the item
  and say so in the README.
- Mention it in PRIVACY (local, nothing sent).
- Test it in Chrome with the DevTools protocol: grant `notifications` and
  `periodicBackgroundSync` with the test context's `browserContextId`, fake
  installed mode by overriding `matchMedia` (CDP can't emulate
  `display-mode`), fire `ServiceWorker.dispatchPeriodicSyncEvent`, and read
  `registration.getNotifications()`: shown once, not twice a day, not after
  playing, text in the chosen language, sync removed when switched off.

### Updates and saved data (the user's choices)
Nobody should ever need to clear site data to get a new version, and an
update must never lose or break players' progress:
- **Update button, no automatic reload** (`registerType: 'prompt'`): check for
  a new version at start, every hour and when the app returns to the
  foreground; when one is downloaded, show a small gold ↻ button in the
  lower-right corner; the new version starts only when it is tapped. (Chosen
  over silent auto-update and network-first loading: the user decides when,
  and nothing reloads mid-game.)
- **Several copies**: open IndexedDB with `blocking` (a newer copy needs to
  upgrade: close the connection and show "update required" with the ↻
  button) and `blocked` (an older copy elsewhere holds the data: say "close
  the other tab or window" and continue when it does). A copy that gets
  `VersionError` (data saved by a newer version) shows only the update notice,
  never an empty player list.
- **Compatibility tests against recorded data**: keep fixtures of the data
  saved by every version (database and export files, recorded from the
  deployed app where possible) and a test that opens each one with the
  current code and fails if a version has no fixture. Every change to saved
  data: record a fixture of the current version first, bump the version,
  migrate, never drop or rename fields without migrating. Write the rule in
  CONTRIBUTING.
- **Backup of all players**: a small, faded grown-ups' button in the player
  picker saves every player in one file (`flag-quiz-backup` format); the
  normal ⬆️ import accepts both single-player files and backups,
  all-or-nothing.
- When switching an existing app from auto-update to the update button, the
  old pages have no button: let the first new service worker activate by
  itself once (see the reference) and verify the switch in a browser with the
  previously deployed build.

### Audience: young children
- As little text as possible; intuitive icons (Lucide). Every icon-only button
  has an `aria-label` and a `title`.
- Prompts and answers are read aloud (Web Speech API, local voices preferred),
  in the app's language: on round start, on click, and on hover with a mouse.
  On touch screens add an explicit 🔊 button wherever hover would be the only
  way to hear something. Follow **Speech without bugs** below.
- Feedback: correct → green ✓, chime (Web Audio, no files), next round after
  **1 s**; wrong → red border/text, shake, and a reveal of what was picked
  (its name, flag, capital or position), also read aloud.
- Big touch targets; calm animations; `prefers-reduced-motion` respected.

### Speech without bugs
Speech bugs came back twice while building Flag Quiz; avoid them from the start:
- **Hover after a new round**: when a new round renders options under a mouse
  that hasn't moved, browsers fire `pointerenter` on the option now under it.
  Only a real transition from not hovering to hovering may speak. Use **one
  shared helper** (`src/lib/hoverSpeech.svelte.ts`) for **every** hoverable
  option and prompt in **every** game: it mutes the element under the
  stationary mouse after each round until `pointerleave`. Fixing this per
  component let the bug survive in the games that were added later.
- **Toggling speech off and on** must not leave the engine silent: reset it
  (`cancel()` + `resume()`) on every toggle, cancel only when something is
  speaking and wait ~80 ms before speaking again, keep a reference to the
  current utterance, and retry once from a watchdog (`src/lib/speech.ts`).
- **Language**: set `utterance.lang` to the app's language and choose a voice
  for it (same region first, offline first); with no matching voice, still set
  `lang`. Re-speak the prompt when the language changes mid-round.
- **Test it**, don't assume: unit-test the speech module with a fake engine,
  and in Playwright replace `speechSynthesis.speak` with a recorder, solve a
  round with the mouse on the right answer, wait for the next round without
  moving, and assert nothing under the mouse was spoken; then leave and
  re-enter and assert it is.

### Languages (i18n)
- Multilingual from the start, with standard i18n practice: no user-visible
  string in components; message catalogues per language
  (`src/locales/<lang>.ts`) keyed like the English one, which is the source of
  truth and the fallback; `{placeholder}` interpolation; no string
  concatenation for sentences; languages other than English loaded on demand
  (and precached for offline use).
- Support **every language that browsers can speak** (a Web Speech voice on
  Android, iOS/macOS or Windows/Edge — Edge's online voices cover the most),
  **that the CLDR names countries in, and that can be translated**: first the
  languages of Wikipedia's [list of languages by total number of
  speakers](https://en.wikipedia.org/wiki/List_of_languages_by_total_number_of_speakers)
  (Ethnologue), then all further ones. Flag Quiz has 77 (see
  `src/lib/languages.ts`). Arabic dialects are served by Modern Standard
  Arabic; languages without a voice (e.g. Nigerian Pidgin, Hausa, Yoruba,
  Western Punjabi, Wu, Bhojpuri) are left out and named in the README/report.
  A language whose CLDR data has no country names (Sundanese) falls back to
  the language its speakers read (Indonesian), also for missing capitals. **English is the default**, not the
  browser's language.
- A language button (文A) in the menu and in the player picker (so it can be
  changed before any player exists) opens a picker showing each language's
  name in itself (English name as tooltip; no flags for languages), **English
  first, then alphabetical by own name** (Latin script first, then the other
  scripts). It must **never scroll**, even with ~80 languages: a grid with
  `auto-fill` columns whose width is a multiple of the text size (wide enough
  for the longest word), names that break only between words, a
  viewport-based width (a dialog that shrinks to its content makes
  `width: 100%` collapse), and a `fit()` that picks the largest text size
  (18 → 7.5 px) at which neither the dialog nor any name overflows — measure
  the name element, not the button (the ✓ badge sticks out). No header row
  (the close button is the last cell) and tight dialog margins. Check from
  568×260 (a phone in landscape with the browser's bars visible) to
  1440×900, not only full-screen sizes.
- **Everything is translated, including the credits page**: generate it in
  English with `data-i18n`, `data-country` and `data-capital` attributes, plus
  one small JSON per language (texts with links filled in, names); the app
  links to `credits.html#<lang>` and an inline script applies the JSON (hash,
  not query, so the precached page still matches offline); precache the JSON.
- Many translations at once can be split across parallel agents (e.g. six
  agents × eight languages), one batch each, with the English file as the source of truth and a
  key/placeholder check they must pass; review their notes on uncertain
  wording, fix false friends (e.g. German "Impressum" is a legal notice, not
  "credits") and report the least certain languages. Ask them to avoid case
  endings on `{name}`-style placeholders (rephrase instead), to use
  typographic apostrophes, and to say where iOS has no UI in the language.
- Wikidata: request labels for many languages with a separate query per
  purpose sent by POST (a single GET with ~80 label columns fails with
  HTTP 414).
- Set `<html lang>` and `dir`; Arabic and Urdu are right to left, so use
  logical CSS properties (`inset-inline-end`, `margin-inline-start`,
  `padding-inline-end`, `border-start-start-radius`…) instead of left/right.
- Use `Intl` for numbers (`NumberFormat`), sorting (`Collator`) and names
  (`DisplayNames` data, generated at build time so it doesn't depend on the
  browser). Item names come from standard sources: countries and continents
  from CLDR, other items (e.g. capitals) from Wikidata labels (prefer
  `zh-hans` for Chinese), with child-friendly overrides where the standard
  names are technical ("Congo - Kinshasa", "Hong Kong SAR China",
  "Sonderverwaltungsregion", abbreviations) — scan every language for them —
  and capitals without "city"/"metropolis" suffixes (市, 都, 특별시…).
- A test checks that every catalogue has every key with the same
  placeholders, and that every item has a name in every language.
- Say that the first translations were machine-made and invite native
  speakers to correct them (README, Contributing).

### Layout and shell
- One page, `100dvh`, never scrolls — at 1280×720 and on a phone in landscape
  (844×390). A "rotate your phone" overlay in portrait on small screens.
- No footer, no navigation bar, no logo in the header (the AOSSIE logo is on
  the splash screen and credits page instead).
- Top left, side by side and large: 🔥 days in a row; for the **current
  game**: gold ⭐ (rounds in a row without mistakes; a mistake resets it to 0),
  silver ⭐ (+1 per round without mistakes, −1 per mistake, never below 0) and
  gold ✅ (correct answers in this game); then green ✅ (correct answers in all
  games).
- Top right: the current player's name, then their custom flag as the profile
  button. In multiplayer, the next players' small flags appear below it.
- Profile menu (all buttons the same size; no wider controls): light/dark,
  edit player, difficulty (one button cycling 3 → 6 → 9 options, showing a
  mini grid), choose items (e.g. continents + top N by population), statistics,
  read-aloud on/off, sound effects on/off, language, share, save data (export), install
  app (phones/tablets only), credits ⓘ, donate ☕ (gold,
  https://buymeacoffee.com/aossie), change game, switch player.
- Everything else happens in modals: pick/create/import/delete players,
  pick game (illustrated tiles, e.g. real flags, photos, "Aa Ee Oo"), edit
  player, statistics, filters.
- Splash screen at start, **~4 s**, tap to skip: app logo, app name in
  **AOSSIE gold**, and "made by" **above** AOSSIE's **green-and-gold**
  secondary logo.
- A discreet full-screen toggle in the lower-right corner (hidden where the
  Fullscreen API is unavailable, e.g. iPhone Safari).

### Branding ([AOSSIE Brand.md](https://github.com/AOSSIE-Org/Info/blob/main/Brand.md))
- CSS variables: Golden Wallet `#FFCD00`, Baggy Green `#00843D`, dark
  `#121212`, white `#FFFFFF`, muted grey `#7A7A7A`; red only for errors.
- Inter (bundled via `@fontsource-variable/inter`); light and dark mode
  (per player, defaulting to the system preference).
- The same look on every page the app ships, including the credits page.

### Players, games and progress
- Players: a name plus a custom flag avatar — 3 colours (kid-friendly palette
  of ~13 including white, grey and black, plus a rainbow "any colour" picker)
  and ~12 patterns (stripes, crosses, circles, rhombuses, stars, moons…).
  In the editor, patterns come before colours.
- Difficulty (3, 6 or 9 options) is **per player**, so children of different
  ages can play together.
- Per player, per game and per item: difficulty score `s` (starts 0.5,
  `s' = 0.9·s + 0.1·z`, z = 1 if wrong) and correct/incorrect counts; mastered
  when `s < 0.2`. Adaptive selection weights items by `s^k`, with `k` going up
  after perfect rounds and down with mistakes; no recent repeats.
- Filters chosen by the player (e.g. continents, and the N most populous among
  them; defaults: all, 100). If the filter leaves too few items, fill the
  distractors from the whole set.
- Scores are kept **per player and per game** (correct answers, current and
  best gold and silver stars), plus the total of correct answers.
- Statistics modal: at the top the days-in-a-row streak (current and best)
  and a 4-week calendar of days played; then a table with one row per game
  (game icon) and the columns best silver stars, best gold stars, and the
  flags (or pictures) of every mastered item with "n/total". The flags shrink
  so the modal grows to fit them and never overflows.
- Multiplayer on one device: 👤/👥 toggle in the player picker; in 👥 mode tap
  to select players, set "rounds in a row per player" (default 3) next to the
  selection, then ▶. Lowest best gold-star run (in any game) plays first; round-robin; the turn passes
  after a mistake (answer revealed first) or after the maximum rounds; a
  banner shows and says the next player's name.
- Export a player as JSON and import it as a new player; validate every field
  of the untrusted file.
- Saved data must survive updates: version the IndexedDB schema and the export
  format, migrate old data forward (e.g. old global scores → per-game scores)
  instead of resetting it, keep importing files from every older version,
  reject files from newer versions with a clear message, and unit-test every
  migration.
- Deleting players is grown-ups only: a small, faded 🗑 enters delete mode;
  confirming requires solving a linear equation (new one after each mistake).

### Content
- Use open data with clear licences, generated by reproducible scripts, with
  attribution in the README and on the credits page.
- Photos (e.g. Wikimedia Commons via Wikidata): representative landmarks,
  freely licensed, small WebP files, with author/licence/source kept.
  **Review every item's photos**, filter out anything unsuitable for children
  (war, violence, prisons, slavery, genocide, adult topics) and fix data errors
  by hand in the script. Leave out politically contested answers (e.g.
  contested capitals) and say so.
- Maps: Natural Earth projected at build time; tiny places get large tappable
  markers; zoom/pan.

### Credits, donations, sharing
- `credits.html`, generated by a script and styled with the brand: title is
  just the app name; one sentence saying it is free and open source software
  by AOSSIE (no software-licence details: they belong in the repo, not in a
  page for families); "Source code: …" in its own paragraph; then a highlighted card saying AOSSIE is a not-for-profit, written
  to encourage donations (no ads, no data collection, free for every child;
  even a coffee helps) and welcoming contributions, with a button to
  https://buymeacoffee.com/aossie; data sources; photo credits grouped by item;
  "made by" AOSSIE logo footer.
- Share button: `navigator.share`, falling back to copying the link.
- Social metadata: title, description, canonical URL, Open Graph + Twitter
  tags with an absolute 1200×630 `og-image.png`, JSON-LD `WebApplication`.
- Installable on phones: "Install app" menu item only on mobile and only when
  not installed; Android uses `beforeinstallprompt`, iOS shows Share → Add to
  Home Screen; manifest with `id`, `display: fullscreen`, orientation,
  maskable icons, screenshots; `apple-mobile-web-app-*` meta tags.

### Repository and CI
- Initialize from [AOSSIE-Org/Template-Repo](https://github.com/AOSSIE-Org/Template-Repo).
  Fill **every** TODO (README, CONTRIBUTING, PRIVACY, MAINTAINERS, issue
  templates, comments) — and the unticked checklists: the README project
  checklist and `BestPracticesChecklist.md` (tick only what is true, with
  evidence; `[~]` + justification for N/A; leave the rest open and say why).
  Add a `SECURITY.md`. Text that merely mentions "TODO" (e.g. in
  `.coderabbit.yaml`) is not a placeholder.
- CI (type-check, tests, build) and a GitHub Pages deploy workflow on every
  push to `main`, actions pinned to commit SHAs.
- Make every template workflow pass. If one needs a secret or setting the repo
  lacks, skip or gate it (see the reference) rather than leave it red.
- Keep dependencies free of known vulnerabilities (npm `overrides` for
  transitive ones) and verify against the OSV database.

## Workflow

### 1. Clarify, then plan
Research first (template, brand guide, data sources: licence, completeness,
freshness, whether the API still exists — Flag Quiz found one retired). Then
present a concise plan and numbered decisions with 2–3 lettered options,
recommended first, so the user can answer "1 - c, 2 - a". Typical decisions:
scope of the content, data sources, avatar design, how touch users hear text,
what counts as a mistake, language(s), offline/PWA, and name, domain, GitHub
repo and maintainers (GitHub + Discord handles). Never guess the repo name or
people's real names. When a request is ambiguous ("counter of correct
guesses"), pick a sensible reading and say so. If a link the user gives can't
be read, say so and use standard practice.

### 2. Scaffold
Copy the template (without `.git`); add Node entries to `.gitignore`; create
`package.json` and install current versions (`svelte`, `vite`,
`@sveltejs/vite-plugin-svelte`, `typescript@^6`, `svelte-check`,
`@tsconfig/svelte`, `vitest`, `fake-indexeddb`, `vite-plugin-pwa`,
`@vite-pwa/assets-generator`, `workbox-window`, `svgo`, `sharp`; runtime `idb`,
`@lucide/svelte`, `@fontsource-variable/inter`). Check peer ranges
(`npm view <pkg> peerDependencies`). Trim `dependabot.yml` to npm + Actions.

### 3. Data and assets
One reproducible script per dataset (`scripts/fetch-*.mjs`, npm scripts),
pinned sources, typed `src/data/*.ts` with a "generated" header naming sources,
licences and date. Remove ambiguous duplicates, cross-check numbers against a
second source, keep names short and child-friendly, review content for
children. Make the logo SVG, PWA icons (`npx pwa-assets-generator`) and the
1200×630 social image (screenshot of an HTML page). `scripts/build-credits.mjs`
regenerates the credits page from the data without re-downloading.

### 4. Build
Pure, unit-tested logic in `src/lib/*.ts`; one Svelte 5 runes state class in
`src/lib/app.svelte.ts` holding game logic shared by all games; presentational
components in `src/components/`.

### 5. Verify — in real browsers, both engines
Run `npm run check`, `npm test`, `npm run build`, `vite preview`, then drive
the app with playwright-core in **Chrome and WebKit** (Safari layout bugs don't
show in Chrome):
- Screenshot every screen at 1280×720 and 844×390 (touch), light and dark,
  every difficulty, and **look at the screenshots**; also check a range of
  sizes (e.g. 740×360 to 1440×900) for overflow programmatically.
- Repeat key screens in a right-to-left language (Arabic) and in languages
  with long words or other scripts (Russian, Hindi, Chinese).
- Assert no scrolling, no `pageerror`/console errors.
- Trace speech (`speechSynthesis` start/end/error events), test the speech
  module with a fake engine, and run the hover-after-new-round check in every
  game (see **Speech without bugs**).
- Offline: wait until the precache is complete, go offline, reload, play.
- Updates, with the previously deployed build and a newer one served in turn
  on the same port: the switch to the new version keeps the players; a newer
  deployment shows ↻ and changes nothing until it is tapped; data opened by a
  newer version shows the update notice; the all-players backup downloads.
- Export/import (download event, `setInputFiles`, a bad file), stress cases
  (e.g. every item mastered), multiplayer turn order and limits, deletion.

### 6. Document, record, ship
- README (features, stack, data and licences, Mermaid architecture and user
  flow, journeys, commands, deployment, screenshots), PRIVACY, CONTRIBUTING,
  SECURITY, checklists, skill — keep them current with every change.
- Keep a running log of the conversation in `prompts/1.md` and update it in
  every turn: the user's prompts verbatim, the assistant's final replies, no
  tool output.
- Commit and push only when asked; split unrelated changes into separate
  commits; after pushing, wait for the workflows and check the live site.
- When a vulnerability or CI report comes in, check which commit it refers to
  before changing anything — it may already be fixed.

## Reporting
Lead with what works and how it was verified (engines, sizes, modes, tests),
then the decisions made on the user's behalf, then what wasn't verified (real
devices, audio playback, browsers not tested).
