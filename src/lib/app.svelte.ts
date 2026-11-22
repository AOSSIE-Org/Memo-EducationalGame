import * as store from './db';
import { dayKey, streaks } from './dates';
import { download, downloadBlob } from './download';
import { i18n, LANGUAGES, setLanguage, t, type LanguageCode } from './i18n.svelte';
import { normalizeImage } from './images';
import { deal, type TableCard } from './memo';
import { disableReminders, enableReminders, notificationsAllowed } from './reminders';
import { scoreFor } from './scores';
import { BUILT_IN_SETS, customSetView, type CardSetView } from './sets';
import { buildSetZip, parseSetZip, SetImportError, MIN_SET_CARDS } from './setzip';
import type { StoredCardSet } from './cardsets';
import { playCorrect, playWrong, setSoundsEnabled } from './sound';
import { setSpeechEnabled, speak } from './speech';
import { persistStorage } from './storage';
import { backupFileName, buildBackup, buildExport, exportFileName, parseImportFile, slug } from './transfer';
import { translateSet } from './translate';
import { markOutdated, update } from './update.svelte';
import { nextTurn, turnOrder } from './turns';
import { withDefaults } from './users';
import {
  DEFAULT_SETTINGS,
  PAIR_OPTIONS,
  SHOW_SECONDS_MAX,
  SHOW_SECONDS_MIN,
  TURN_ROUNDS_MAX,
  TURN_ROUNDS_MIN,
  type Avatar,
  type Settings,
  type Theme,
  type User,
} from './types';

export type Phase = 'loading' | 'pickUser' | 'pickGame' | 'playing';
export type EditorMode = 'new' | 'edit';
export type PickerMode = 'single' | 'multi';

/** A game in progress. */
export interface Game {
  id: number;
  setId: string;
  table: TableCard[];
  /** Keys of the cards picked in the current round (face up). */
  picked: number[];
  /** Two different cards are face up, waiting to be turned back. */
  mismatch: boolean;
  /** All pairs found. */
  finished: boolean;
}

/** Duration of the card-turning animation (also in CSS). */
export const FLIP_MS = 450;
/** How long a pair that was found stays on the table before it flies to the player. */
export const MATCH_SHOW_MS = 1100;
/** Duration of the flight of a pair to the player. */
export const FLY_MS = 900;
/** Multiplayer: how long the "next player" banner is shown. */
export const TURN_BANNER_MS = 1600;

export function systemTheme(): Theme {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v)));

class AppState {
  phase = $state<Phase>('loading');
  users = $state<User[]>([]);
  editor = $state<EditorMode | null>(null);
  menuOpen = $state(false);
  statsOpen = $state(false);
  languageOpen = $state(false);
  /** Card set editor: the id of the set being edited, or '' for a new set. */
  setEditor = $state<string | null>(null);
  /** The dialog to load a card set from a zip file or a link. */
  setImportOpen = $state(false);
  /** Topic chosen in the card set picker (null: all). */
  topic = $state<string | null>(null);
  /** The daily reminder could not be switched on (notifications not allowed). */
  reminderBlocked = $state(false);
  settings = $state<Settings>({ ...DEFAULT_SETTINGS });

  /** Player picker: one player, or several players taking turns. */
  pickerMode = $state<PickerMode>('single');
  /** Player picker, multiplayer: ids of the players who will play. */
  selectedIds = $state<number[]>([]);

  /** Players of the current session, in turn order. */
  players = $state<User[]>([]);
  turn = $state(0);
  /** Multiplayer: the player whose turn just started, shown in a banner. */
  banner = $state<User | null>(null);
  playDaysById = $state<Record<number, string[]>>({});

  /** Card sets made or loaded on this device. */
  customSets = $state.raw<StoredCardSet[]>([]);
  game = $state<Game | null>(null);
  /** Rounds (two cards turned) per player in the current game. */
  gameRounds = $state<Record<number, number>>({});
  /** Pairs found per player in the current game. */
  gamePairs = $state<Record<number, number>>({});

  /** The player whose turn it is. */
  user = $derived<User | null>(this.players[this.turn] ?? null);
  multiplayer = $derived(this.players.length > 1);
  playDays = $derived(this.user?.id !== undefined ? (this.playDaysById[this.user.id] ?? []) : []);
  dayStreak = $derived(streaks(this.playDays));
  /** Every card set: built-in ones first, then the custom ones, newest first. */
  sets = $derived<CardSetView[]>([
    ...BUILT_IN_SETS,
    ...[...this.customSets]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((s) => customSetView(s, (cardId) => this.imageUrl(s.id, cardId))),
  ]);
  /** The card set of the current game, or the one played last. */
  currentSetId = $derived(this.game?.setId ?? this.settings.lastSet ?? BUILT_IN_SETS[0].id);
  /** The card set of the current game. */
  gameSet = $derived(this.game ? (this.sets.find((s) => s.id === this.game!.setId) ?? null) : null);

  #db: store.DB | null = null;
  /** Pictures of custom sets: set id → card id → picture. */
  #images = new Map<string, Map<string, Blob>>();
  #urls = new Map<string, string>();
  #gameSeq = 0;
  /** Multiplayer: rounds the current player has played in a row in this turn. */
  #turnRounds = 0;
  /** Incremented whenever pending timers must be ignored. */
  #session = 0;
  #mismatchSeq = 0;
  /** When two different cards were last turned back by a tap (that tap must not also turn a new card). */
  #turnedBackAt = 0;
  #translating = new Set<string>();

  async init(): Promise<void> {
    try {
      this.#db = await store.openDatabase(store.DB_NAME, {
        blocked: () => (update.blocked = true),
        blocking: () => {
          this.#db = null;
          markOutdated();
        },
      });
      update.blocked = false;
      this.users = (await store.listUsers(this.#db)).map(withDefaults);
      this.settings = { ...DEFAULT_SETTINGS, ...(await store.getSettings(this.#db)) };
      const [sets, images] = await Promise.all([store.listCardSets(this.#db), store.getAllCardImages(this.#db)]);
      for (const img of images) this.#imagesOf(img.setId).set(img.cardId, img.blob);
      this.customSets = sets;
    } catch (err) {
      this.#db = null;
      if (err instanceof DOMException && err.name === 'VersionError') {
        markOutdated();
      } else {
        console.warn('IndexedDB unavailable; progress will not be saved.', err);
      }
    }
    setSpeechEnabled(this.settings.speech);
    setSoundsEnabled(this.settings.sounds);
    await setLanguage(this.settings.language);
    if (this.settings.reminders && notificationsAllowed()) void enableReminders().then(() => this.#saveReminder());
    this.phase = 'pickUser';
    if (this.users.length === 0) this.editor = 'new';
    void this.translateSets();
  }

  // --------------------------------------------------------------- settings

  setSettings(patch: Partial<Settings>): void {
    const next = { ...this.settings, ...patch };
    next.turnRounds = clamp(next.turnRounds, TURN_ROUNDS_MIN, TURN_ROUNDS_MAX);
    next.showSeconds = clamp(next.showSeconds, SHOW_SECONDS_MIN, SHOW_SECONDS_MAX);
    if (!PAIR_OPTIONS.some((o) => o.pairs === next.pairs)) next.pairs = DEFAULT_SETTINGS.pairs;
    const languageChanged = next.language !== this.settings.language;
    this.settings = next;
    if (languageChanged) {
      void setLanguage(next.language).then(() => {
        void this.#saveReminder();
        void this.translateSets();
      });
    }
    setSpeechEnabled(next.speech);
    setSoundsEnabled(next.sounds);
    if (this.#db) void store.saveSettings(this.#db, $state.snapshot(next) as Settings);
  }

  async toggleReminders(): Promise<void> {
    if (this.settings.reminders) {
      await disableReminders();
      this.reminderBlocked = false;
      this.setSettings({ reminders: false });
    } else {
      const on = await enableReminders();
      this.reminderBlocked = !on;
      if (on) this.setSettings({ reminders: true });
    }
    await this.#saveReminder();
  }

  async #saveReminder(): Promise<void> {
    if (!this.#db) return;
    const lang = LANGUAGES.find((l) => l.code === i18n.lang) ?? LANGUAGES[0];
    await store.saveReminder(this.#db, { enabled: this.settings.reminders, body: t('reminderBody'), lang: lang.code, dir: lang.dir });
  }

  // ---------------------------------------------------------------- players

  setPickerMode(mode: PickerMode): void {
    this.pickerMode = mode;
  }

  toggleSelected(id: number): void {
    this.selectedIds = this.selectedIds.includes(id) ? this.selectedIds.filter((x) => x !== id) : [...this.selectedIds, id];
  }

  async startMultiplayer(): Promise<void> {
    const selected = this.users.filter((u) => u.id !== undefined && this.selectedIds.includes(u.id));
    if (selected.length >= 2) await this.startSession(selected);
  }

  /** Starts a session with one or more players and shows the card set picker. */
  async startSession(selected: User[]): Promise<void> {
    this.#session++;
    const now = Date.now();
    let players = selected.map((u) => ({ ...withDefaults(u), lastActiveAt: now }));
    // Multiplayer: the players who found fewest pairs so far start.
    if (players.length > 1) players = turnOrder(players, (p) => p.correctCount);
    await Promise.all(players.map((p) => this.#loadDays(p)));
    this.players = players;
    this.turn = 0;
    this.banner = null;
    this.game = null;
    applyTheme(players[0].theme);
    await Promise.all(this.players.map((p) => this.#saveUser(p)));
    this.editor = null;
    this.phase = 'pickGame';
    void persistStorage();
  }

  async #loadDays(player: User): Promise<void> {
    if (player.id === undefined || !this.#db) return;
    const days = await store.getPlayDays(this.#db, player.id);
    this.playDaysById = { ...this.playDaysById, [player.id]: days };
  }

  async createUser(name: string, avatar: Avatar): Promise<void> {
    const now = Date.now();
    const user: User = { name, avatar, theme: currentTheme(), scores: {}, correctCount: 0, createdAt: now, lastActiveAt: now };
    const saved = this.#db ? await store.saveUser(this.#db, user) : { ...user, id: -now };
    this.users = [saved, ...this.users];
    if (this.pickerMode === 'multi') {
      this.selectedIds = [...this.selectedIds, saved.id!];
      this.editor = null;
    } else {
      await this.startSession([saved]);
    }
  }

  async updateUser(name: string, avatar: Avatar): Promise<void> {
    if (!this.user) return;
    this.user.name = name;
    this.user.avatar = avatar;
    this.editor = null;
    await this.#saveUser(this.user);
  }

  /** Deletes a player and all their data. Not allowed for players in the current session. */
  async deleteUser(id: number): Promise<void> {
    if (this.players.some((p) => p.id === id)) return;
    if (this.#db) await store.deleteUserWithData(this.#db, id);
    this.users = this.users.filter((u) => u.id !== id);
    this.selectedIds = this.selectedIds.filter((x) => x !== id);
  }

  switchUser(): void {
    this.#session++;
    this.menuOpen = false;
    this.game = null;
    this.banner = null;
    this.players = [];
    this.turn = 0;
    this.phase = 'pickUser';
  }

  /** Light/dark mode applies to everyone playing. */
  toggleTheme(): void {
    if (!this.user) return;
    const theme: Theme = this.user.theme === 'dark' ? 'light' : 'dark';
    for (const p of this.players) {
      p.theme = theme;
      void this.#saveUser(p);
    }
    applyTheme(theme);
  }

  async #saveUser(player: User): Promise<void> {
    const snapshot = $state.snapshot(player) as User;
    if (this.#db) await store.saveUser(this.#db, snapshot);
    this.users = this.users.map((u) => (u.id === snapshot.id ? snapshot : u));
  }

  // ------------------------------------------------------- export / import

  exportUser(): void {
    if (!this.user) return;
    const data = buildExport($state.snapshot(this.user) as User, this.playDays);
    download(JSON.stringify(data, null, 2), exportFileName(this.user.name));
  }

  async exportAll(): Promise<void> {
    const db = this.#db;
    const players = await Promise.all(
      this.users.map(async (u) => ({
        user: $state.snapshot(u) as User,
        playDays: db ? await store.getPlayDays(db, u.id!) : (this.playDaysById[u.id!] ?? []),
      })),
    );
    download(JSON.stringify(buildBackup(players), null, 2), backupFileName());
  }

  /** Creates new players from a player file or a backup. Throws ImportError on invalid files. */
  async importFile(text: string): Promise<User[]> {
    const imported = parseImportFile(text);
    const users: User[] = [];
    for (const p of imported) {
      users.push(this.#db ? await store.insertUserWithData(this.#db, p.user, p.playDays) : { ...p.user, id: -Date.now() - users.length });
    }
    this.users = [...users, ...this.users];
    return users;
  }

  // -------------------------------------------------------------- card sets

  #imagesOf(setId: string): Map<string, Blob> {
    let m = this.#images.get(setId);
    if (!m) this.#images.set(setId, (m = new Map()));
    return m;
  }

  /** The pictures of a custom set, by card id. */
  imagesOf(setId: string): ReadonlyMap<string, Blob> {
    return this.#images.get(setId) ?? new Map();
  }

  /** A URL for the picture of a card of a custom set. */
  imageUrl(setId: string, cardId: string): string {
    const key = `${setId}/${cardId}`;
    let url = this.#urls.get(key);
    if (!url) {
      const blob = this.#images.get(setId)?.get(cardId);
      if (!blob) return '';
      url = URL.createObjectURL(blob);
      this.#urls.set(key, url);
    }
    return url;
  }

  #forgetUrls(setId: string, cardIds?: Iterable<string>): void {
    const ids = cardIds ? [...cardIds] : [...(this.#images.get(setId)?.keys() ?? [])];
    for (const id of ids) {
      const key = `${setId}/${id}`;
      const url = this.#urls.get(key);
      if (url) URL.revokeObjectURL(url);
      this.#urls.delete(key);
    }
  }

  /** Saves a new or edited custom set; `images` holds the new or changed pictures. */
  async saveCardSet(set: StoredCardSet, images: ReadonlyMap<string, Blob>): Promise<void> {
    const copy = $state.snapshot(set) as StoredCardSet;
    if (this.#db) await store.saveCardSet(this.#db, copy, images);
    const pictures = this.#imagesOf(copy.id);
    const keep = new Set(copy.cards.map((c) => c.id));
    this.#forgetUrls(copy.id, [...pictures.keys()].filter((id) => !keep.has(id) || images.has(id)));
    for (const id of [...pictures.keys()]) if (!keep.has(id)) pictures.delete(id);
    for (const [id, blob] of images) if (keep.has(id)) pictures.set(id, blob);
    this.customSets = [...this.customSets.filter((s) => s.id !== copy.id), copy];
    void this.translateSets();
  }

  async deleteCardSet(id: string): Promise<void> {
    if (this.game?.setId === id) return;
    if (this.#db) await store.deleteCardSet(this.#db, id);
    this.#forgetUrls(id);
    this.#images.delete(id);
    this.customSets = this.customSets.filter((s) => s.id !== id);
  }

  /** Loads a card set from the bytes of a zip file; returns its id. Throws SetImportError. */
  async importCardSet(bytes: Uint8Array): Promise<string> {
    const { set, images } = parseSetZip(bytes, i18n.lang);
    const pictures = new Map<string, Blob>();
    for (const [cardId, img] of images) {
      try {
        pictures.set(cardId, await normalizeImage(new Blob([img.bytes as BlobPart], { type: img.type })));
      } catch {
        // Not a picture the browser can show: leave the card out.
      }
    }
    set.cards = set.cards.filter((c) => pictures.has(c.id));
    if (set.cards.length < MIN_SET_CARDS) throw new SetImportError('tooFewCards');
    await this.saveCardSet(set, pictures);
    return set.id;
  }

  /** Downloads a card set from a link (to a zip file) and loads it. */
  async importCardSetFromUrl(url: string): Promise<string> {
    let bytes: Uint8Array;
    try {
      const res = await fetch(new URL(url).href);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      bytes = new Uint8Array(await res.arrayBuffer());
    } catch {
      throw new SetImportError('download');
    }
    return this.importCardSet(bytes);
  }

  /** Downloads a card set as a zip file. */
  async exportCardSet(set: StoredCardSet, images: ReadonlyMap<string, Blob>): Promise<void> {
    const zip = await buildSetZip(set, images);
    downloadBlob(new Blob([zip as BlobPart], { type: 'application/zip' }), setZipName(set, i18n.lang));
  }

  /** Translates custom sets into the app's language on the device, where the browser can. */
  async translateSets(): Promise<void> {
    const lang = i18n.lang as LanguageCode;
    for (const set of this.customSets) {
      const key = `${set.id}:${lang}`;
      if (this.#translating.has(key)) continue;
      this.#translating.add(key);
      const translated = await translateSet(set, lang);
      if (!translated || !this.customSets.some((s) => s.id === set.id)) continue;
      if (this.#db) await store.saveCardSetTexts(this.#db, translated);
      this.customSets = this.customSets.map((s) => (s.id === set.id ? translated : s));
    }
  }

  // ------------------------------------------------------------------ game

  /** Starts a game with a card set and the chosen number of pairs. */
  startGame(setId: string): void {
    const set = this.sets.find((s) => s.id === setId);
    if (!set || set.cards.length < MIN_SET_CARDS) return;
    const pairs = Math.min(this.settings.pairs, set.cards.length);
    this.#session++;
    this.menuOpen = false;
    this.banner = null;
    this.#turnRounds = 0;
    this.gameRounds = {};
    this.gamePairs = {};
    this.game = {
      id: ++this.#gameSeq,
      setId,
      table: deal(
        set.cards.map((c) => c.id),
        pairs,
      ),
      picked: [],
      mismatch: false,
      finished: false,
    };
    if (this.settings.lastSet !== setId) this.setSettings({ lastSet: setId });
    this.phase = 'playing';
  }

  /** The same card set again. */
  playAgain(): void {
    if (this.game) this.startGame(this.game.setId);
  }

  /** Shows the card set picker; the current game is kept so the picker can be dismissed. */
  changeGame(): void {
    this.menuOpen = false;
    this.phase = 'pickGame';
  }

  /** Runs `fn` after `ms`, unless the game or session changed meanwhile. */
  #later(ms: number, fn: () => void): void {
    const gameId = this.game?.id;
    const session = this.#session;
    setTimeout(() => {
      if (this.game?.id === gameId && this.#session === session) fn();
    }, ms);
  }

  /** A card's description in the app's language, with its language for speech. */
  describe(cardId: string): { text: string; lang: LanguageCode } {
    return this.gameSet?.describe(cardId) ?? { text: '', lang: i18n.lang };
  }

  speakCard(cardId: string): void {
    const d = this.describe(cardId);
    speak(d.text, d.lang === i18n.lang ? undefined : LANGUAGES.find((l) => l.code === d.lang)?.speech);
  }

  /** Whether a tap on the table does anything now. */
  get busy(): boolean {
    const g = this.game;
    return !g || g.finished || !!this.banner || g.table.some((c) => c.state === 'matched');
  }

  /** The player taps a card (or the table while two different cards are face up). */
  flip(key: number): void {
    const game = this.game;
    const user = this.user;
    if (!game || !user || user.id === undefined || this.busy) return;
    if (game.mismatch) {
      this.turnBack();
      return;
    }
    if (Date.now() - this.#turnedBackAt < 350) return;
    const card = game.table.find((c) => c.key === key);
    if (!card || card.state !== 'down' || game.picked.length >= 2) return;
    this.#markPlayedToday(user);
    card.state = 'up';
    game.picked.push(key);
    this.speakCard(card.cardId);
    if (game.picked.length < 2) return;

    const id = user.id;
    this.gameRounds = { ...this.gameRounds, [id]: (this.gameRounds[id] ?? 0) + 1 };
    const [a, b] = game.picked.map((k) => game.table.find((c) => c.key === k)!);
    if (a.cardId === b.cardId) {
      setTimeout(playCorrect, FLIP_MS);
      user.correctCount++;
      scoreFor(user.scores, game.setId).pairs++;
      this.gamePairs = { ...this.gamePairs, [id]: (this.gamePairs[id] ?? 0) + 1 };
      this.#turnRounds++;
      void this.#saveUser(user);
      this.#later(MATCH_SHOW_MS, () => {
        a.state = b.state = 'matched';
        game.picked = [];
        // The board animates the flight; then the cards leave the table.
        this.#later(FLY_MS, () => {
          a.state = b.state = 'gone';
          this.#afterPair();
        });
      });
    } else {
      setTimeout(playWrong, FLIP_MS);
      game.mismatch = true;
      const seq = ++this.#mismatchSeq;
      this.#later(FLIP_MS + this.settings.showSeconds * 1000, () => {
        if (seq === this.#mismatchSeq && game.mismatch) this.turnBack();
      });
    }
  }

  /** Turns two different cards face down again (after the time, or on a tap). */
  turnBack(): void {
    const game = this.game;
    if (!game?.mismatch) return;
    this.#mismatchSeq++;
    this.#turnedBackAt = Date.now();
    for (const c of game.table) if (c.state === 'up') c.state = 'down';
    game.picked = [];
    game.mismatch = false;
    if (this.multiplayer) this.#later(FLIP_MS, () => this.#passTurn());
  }

  #afterPair(): void {
    const game = this.game;
    if (!game) return;
    if (game.table.every((c) => c.state === 'gone')) {
      this.#finish();
    } else if (this.multiplayer && this.#turnRounds >= this.settings.turnRounds) {
      // The maximum rounds in a row: the next player plays.
      this.#passTurn();
    }
  }

  #finish(): void {
    const game = this.game;
    if (!game) return;
    game.finished = true;
    for (const p of this.players) {
      scoreFor(p.scores, game.setId).completed++;
      void this.#saveUser(p);
    }
    playCorrect();
    speak(t('allPairsFound'));
  }

  #passTurn(): void {
    this.#turnRounds = 0;
    if (!this.multiplayer) return;
    this.turn = nextTurn(this.turn, this.players.length);
    const player = this.user;
    if (!player) return;
    this.banner = player;
    speak(player.name);
    this.#later(TURN_BANNER_MS, () => (this.banner = null));
  }

  #markPlayedToday(user: User): void {
    const today = dayKey();
    if (user.id === undefined) return;
    const days = this.playDaysById[user.id] ?? [];
    if (days.includes(today)) return;
    this.playDaysById = { ...this.playDaysById, [user.id]: [...days, today] };
    if (this.#db) void store.addPlayDay(this.#db, user.id, today);
  }
}

/** File name of a card set's zip file. */
export function setZipName(set: StoredCardSet, lang: LanguageCode): string {
  return `memo-${slug(set.name[lang] ?? set.name[set.language] ?? '', 'cards')}.zip`;
}

function currentTheme(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === 'dark' || t === 'light' ? t : systemTheme();
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#121212' : '#FFFFFF');
}

/** Shares the app with the system share sheet, or copies its link. */
export async function shareApp(): Promise<'shared' | 'copied' | 'failed'> {
  const url = new URL('./', location.href).href;
  const data = { title: 'Memo', text: t('shareText'), url };
  try {
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      await navigator.share(data);
      return 'shared';
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'shared';
    return 'failed';
  }
}

export const app = new AppState();
