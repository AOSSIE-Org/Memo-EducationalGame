<script lang="ts">
  import { Check, CloudUpload, FileArchive, ImagePlus, LoaderCircle, Pencil, Plus, Tag, X } from '@lucide/svelte';
  import { onDestroy, untrack } from 'svelte';
  import { app, setZipName } from '../lib/app.svelte';
  import {
    cleanText,
    editText,
    localText,
    MAX_CARDS,
    MAX_DESCRIPTION,
    MAX_SET_NAME,
    MAX_TAG,
    MAX_TAGS,
    nameFromFile,
    newId,
    type StoredCardSet,
  } from '../lib/cardsets';
  import { driveConfigured, preloadDrive, saveToDrive } from '../lib/drive';
  import { i18n, LANGUAGES, num, t } from '../lib/i18n.svelte';
  import { normalizeImage } from '../lib/images';
  import { buildSetZip, MIN_SET_CARDS } from '../lib/setzip';
  import type { Localized } from '../lib/types';
  import Modal from './Modal.svelte';

  /** Edits a custom card set (`setId`), or makes a new one (`setId` = ''). Texts are written in the app's language. */
  let { setId }: { setId: string } = $props();

  interface DraftCard {
    id: string;
    text: Localized;
    /** The description as shown and edited, in the app's language. */
    value: string;
    initial: string;
    src: string;
  }

  const lang = untrack(() => i18n.lang);
  const existing = untrack(() => app.customSets.find((s) => s.id === setId));
  const base: StoredCardSet = existing
    ? (structuredClone($state.snapshot(existing)) as StoredCardSet)
    : { id: newId('c'), language: lang, name: {}, tags: [], cards: [], auto: [], createdAt: Date.now(), updatedAt: Date.now() };
  const shown = (text: Localized) => localText(text, lang, base.language).text;

  const initialName = shown(base.name);
  let name = $state(initialName);
  let tags = $state(base.tags.map((text) => ({ text, value: shown(text), initial: shown(text) })));
  let tagInput = $state('');
  let cards = $state<DraftCard[]>(
    base.cards.map((c) => ({ id: c.id, text: c.description, value: shown(c.description), initial: shown(c.description), src: app.imageUrl(base.id, c.id) })),
  );
  /** Pictures added in this editor, by card id. */
  const added = new Map<string, Blob>();
  const ownUrls: string[] = [];
  onDestroy(() => ownUrls.forEach((u) => URL.revokeObjectURL(u)));

  let busy = $state(false);
  let skipped = $state(0);
  let dragging = $state(false);
  let drive = $state<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  let fileInput: HTMLInputElement;

  let valid = $derived(cleanText(name, MAX_SET_NAME).length > 0 && cards.length >= MIN_SET_CARDS);
  let languageName = $derived(LANGUAGES.find((l) => l.code === lang)?.name ?? lang);
  let hasDrive = driveConfigured();
  if (hasDrive) preloadDrive().catch(() => {});

  async function addFiles(files: Iterable<File>) {
    busy = true;
    skipped = 0;
    for (const file of files) {
      if (cards.length >= MAX_CARDS) {
        skipped++;
        continue;
      }
      try {
        const blob = await normalizeImage(file);
        const id = newId('k');
        added.set(id, blob);
        const src = URL.createObjectURL(blob);
        ownUrls.push(src);
        const value = nameFromFile(file.name);
        cards.push({ id, text: {}, value, initial: '', src });
      } catch {
        skipped++;
      }
    }
    busy = false;
  }

  function onFiles() {
    const files = [...(fileInput.files ?? [])];
    fileInput.value = '';
    void addFiles(files);
  }

  function ondrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/') || f.type === '');
    if (files.length) void addFiles(files);
  }

  function addTag() {
    const value = cleanText(tagInput, MAX_TAG);
    tagInput = '';
    if (!value || tags.length >= MAX_TAGS || tags.some((x) => x.value.toLocaleLowerCase() === value.toLocaleLowerCase())) return;
    tags.push({ text: {}, value, initial: '' });
  }

  function onTagKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  }

  /** The set with the edits applied: only texts changed here are written, in the app's language. */
  function build(): StoredCardSet {
    if (tagInput.trim()) addTag();
    const auto = base.auto;
    const apply = (text: Localized, value: string, initial: string, max: number) => {
      const clean = cleanText(value, max);
      return clean === initial ? text : editText(text, lang, clean, auto);
    };
    const changed = (a: Localized, b: Localized) => JSON.stringify(a) !== JSON.stringify(b);
    const set: StoredCardSet = {
      ...base,
      name: apply(base.name, name, initialName, MAX_SET_NAME),
      tags: tags.map((x) => apply(x.text, x.value, x.initial, MAX_TAG)).filter((x) => Object.keys(x).length > 0),
      cards: cards.map((c) => ({ id: c.id, description: apply(c.text, c.value, c.initial, MAX_DESCRIPTION) })),
      updatedAt: Date.now(),
    };
    // Languages whose automatic translations were corrected here are no longer automatic.
    const edited =
      changed(set.name, base.name) || set.tags.length !== base.tags.length || set.cards.some((c, i) => changed(c.description, base.cards[i]?.description ?? {}));
    if (edited) set.auto = set.auto.filter((l) => l !== lang);
    return set;
  }

  /** Every picture of the set: the ones already saved and the ones added here. */
  function allImages(set: StoredCardSet): Map<string, Blob> {
    const saved = app.imagesOf(base.id);
    const out = new Map<string, Blob>();
    for (const c of set.cards) {
      const blob = added.get(c.id) ?? saved.get(c.id);
      if (blob) out.set(c.id, blob);
    }
    return out;
  }

  async function save() {
    if (!valid || busy) return;
    busy = true;
    const set = build();
    await app.saveCardSet(set, new Map([...added].filter(([id]) => set.cards.some((c) => c.id === id))));
    busy = false;
    app.setEditor = null;
  }

  async function exportZip() {
    const set = build();
    await app.exportCardSet(set, allImages(set));
  }

  async function toDrive() {
    if (!hasDrive || drive === 'saving') return;
    drive = 'saving';
    try {
      const set = build();
      const zip = await buildSetZip(set, allImages(set));
      await saveToDrive(new Blob([zip as BlobPart], { type: 'application/zip' }), setZipName(set, lang));
      drive = 'saved';
    } catch (err) {
      console.warn(err);
      drive = 'failed';
    }
    setTimeout(() => (drive = 'idle'), 3000);
  }

  const driveTitle = $derived(
    !hasDrive ? t('driveNotSetUp') : drive === 'saving' ? t('driveSaving') : drive === 'saved' ? t('driveSaved') : drive === 'failed' ? t('driveFailed') : t('saveToDrive'),
  );
</script>

<Modal label={setId ? t('editCardSet') : t('newCardSet')} onclose={() => (app.setEditor = null)} wide>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="editor"
    class:dragging
    ondragover={(e) => (e.preventDefault(), (dragging = true))}
    ondragleave={(e) => e.currentTarget === e.target && (dragging = false)}
    {ondrop}
  >
    <div class="head">
      <label class="field name">
        <Pencil size={20} aria-hidden="true" />
        <span class="visually-hidden">{t('setName')}</span>
        <input bind:value={name} maxlength={MAX_SET_NAME} placeholder={t('setName')} autocomplete="off" spellcheck="true" lang={lang} />
        <small class="left">{num(MAX_SET_NAME - [...name].length)}</small>
      </label>
      <div class="tags" role="group" aria-label={t('topics')}>
        <Tag size={18} aria-hidden="true" class="tag-icon" />
        {#each tags as tag, i (i)}
          <span class="chip">
            <input class="chip-input" bind:value={tag.value} maxlength={MAX_TAG} size={Math.max(3, [...tag.value].length)} aria-label={t('topics')} lang={lang} />
            <button onclick={() => tags.splice(i, 1)} aria-label={t('removeTopic', { name: tag.value })} title={t('removeTopic', { name: tag.value })}>
              <X size={14} />
            </button>
          </span>
        {/each}
        {#if tags.length < MAX_TAGS}
          <span class="chip new">
            <input
              bind:value={tagInput}
              maxlength={MAX_TAG}
              placeholder={t('addTopic')}
              onkeydown={onTagKey}
              onblur={addTag}
              aria-label={t('addTopic')}
              lang={lang}
            />
            <button onclick={addTag} aria-label={t('addTopic')} title={t('addTopic')}><Plus size={14} /></button>
          </span>
        {/if}
      </div>
      <p class="lang">{t('textLanguage', { language: languageName })}</p>
    </div>

    <ul class="cards">
      {#each cards as card, i (card.id)}
        <li class="card">
          <span class="pic"><img src={card.src} alt="" draggable="false" /></span>
          <input
            class="desc"
            bind:value={card.value}
            maxlength={MAX_DESCRIPTION}
            aria-label={t('cardDescription', { n: i + 1 })}
            title={t('cardDescription', { n: i + 1 })}
            lang={lang}
          />
          <button class="remove" onclick={() => cards.splice(i, 1)} aria-label={t('removeCard', { n: i + 1 })} title={t('removeCard', { n: i + 1 })}>
            <X size="100%" strokeWidth={3} />
          </button>
        </li>
      {/each}
      <li>
        <button class="add" onclick={() => fileInput.click()} aria-label={t('addPictures')} title={t('addPictures')} disabled={busy}>
          {#if busy}<LoaderCircle class="spin" size="40%" />{:else}<ImagePlus size="40%" />{/if}
          <small>{t('dropPictures')}</small>
        </button>
      </li>
    </ul>
    <input bind:this={fileInput} type="file" accept="image/*" multiple class="visually-hidden" tabindex="-1" onchange={onFiles} />

    {#if skipped}
      <p class="note" role="status">{t('skippedFiles', { n: skipped })}</p>
    {:else if cards.length >= MAX_CARDS}
      <p class="note" role="status">{t('tooManyCards', { n: MAX_CARDS })}</p>
    {/if}

    <div class="actions">
      <button class="icon-btn" onclick={() => (app.setEditor = null)} aria-label={t('cancel')} title={t('cancel')}>
        <X size={28} />
      </button>
      <span class="spacer"></span>
      <button class="icon-btn" onclick={exportZip} disabled={cards.length === 0} aria-label={t('saveZip')} title={t('saveZip')}>
        <FileArchive size={24} />
      </button>
      <button
        class="icon-btn drive"
        class:off={!hasDrive}
        class:ok={drive === 'saved'}
        class:bad={drive === 'failed'}
        onclick={toDrive}
        disabled={cards.length === 0}
        aria-label={driveTitle}
        title={driveTitle}
      >
        {#if drive === 'saving'}<LoaderCircle class="spin" size={24} />{:else if drive === 'saved'}<Check size={24} />{:else}<CloudUpload size={24} />{/if}
      </button>
      <button class="icon-btn primary" onclick={save} disabled={!valid || busy} aria-label={t('save')} title={valid ? t('save') : t('minCards', { n: MIN_SET_CARDS })}>
        <Check size={32} strokeWidth={3} />
      </button>
    </div>
  </div>
</Modal>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: clamp(8px, 2vmin, 14px);
    width: min(900px, 90vw);
    max-height: calc(100dvh - 2 * var(--gutter) - 2 * clamp(12px, 3vmin, 28px));
    border-radius: var(--radius);
    outline: 3px dashed transparent;
    outline-offset: 4px;
    transition: outline-color 0.15s ease;
  }
  .editor.dragging {
    outline-color: var(--green);
  }
  .head {
    display: grid;
    gap: 8px;
    flex-shrink: 0;
  }
  .field {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border-radius: var(--radius-sm);
    background: var(--surface);
    border: 2px solid var(--border);
    color: var(--muted);
  }
  .field:focus-within {
    border-color: var(--focus);
  }
  input {
    min-width: 0;
    border: 0;
    outline: none;
    background: none;
    color: var(--text);
    font: inherit;
    font-weight: 600;
    user-select: text;
    -webkit-user-select: text;
  }
  .name input {
    flex: 1;
    padding: clamp(6px, 1.4vmin, 10px) 0;
    font-size: clamp(16px, 3.2vmin, 22px);
  }
  .left {
    font-variant-numeric: tabular-nums;
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    color: var(--muted);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 3px 4px 3px 10px;
    border-radius: 999px;
    background: var(--surface);
    border: 2px solid var(--border);
  }
  .chip:focus-within {
    border-color: var(--focus);
  }
  .chip input {
    font-size: 14px;
    width: auto;
  }
  .chip.new input {
    width: 12ch;
  }
  .chip button {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    color: var(--muted);
  }
  .chip button:hover {
    background: var(--surface-2);
  }
  .lang {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
  }
  .cards {
    list-style: none;
    margin: 0;
    padding: 4px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(clamp(110px, 18vmin, 150px), 1fr));
    gap: 10px;
    overflow-y: auto;
    min-height: 0;
    flex: 1 1 auto;
    overscroll-behavior: contain;
  }
  .card {
    position: relative;
    display: grid;
    gap: 4px;
  }
  .pic {
    display: grid;
    place-items: center;
    aspect-ratio: 1;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.2);
    overflow: hidden;
  }
  .pic img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .desc {
    width: 100%;
    padding: 4px 6px;
    border-radius: 6px;
    background: var(--surface);
    border: 2px solid var(--border);
    font-size: 13px;
    text-align: center;
  }
  .desc:focus {
    border-color: var(--focus);
  }
  .remove {
    position: absolute;
    top: -6px;
    inset-inline-end: -6px;
    width: 24px;
    height: 24px;
    padding: 4px;
    border-radius: 50%;
    background: var(--bad);
    color: #fff;
    opacity: 0.85;
  }
  .add {
    width: 100%;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 4px;
    border-radius: 8px;
    border: 3px dashed var(--muted);
    color: var(--green);
  }
  .add small {
    padding: 0 6px;
    font-size: 11px;
    color: var(--muted);
    text-align: center;
  }
  .note {
    margin: 0;
    font-size: 13px;
    color: var(--bad);
    font-weight: 600;
  }
  .actions {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-shrink: 0;
  }
  .spacer {
    flex: 1;
  }
  .icon-btn.off {
    opacity: 0.4;
  }
  .icon-btn.ok {
    background: var(--ok);
    color: #fff;
  }
  .icon-btn.bad {
    background: var(--bad);
    color: #fff;
  }
  :global(.spin) {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
