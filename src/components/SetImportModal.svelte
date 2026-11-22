<script lang="ts">
  import { FileArchive, Link, LoaderCircle, X } from '@lucide/svelte';
  import { app } from '../lib/app.svelte';
  import { t } from '../lib/i18n.svelte';
  import { MAX_ZIP_BYTES, SetImportError } from '../lib/setzip';
  import Modal from './Modal.svelte';

  /** Loads a card set from a zip file (cardset.json + pictures), chosen on the device or downloaded from a link. */
  let fileInput: HTMLInputElement;
  let url = $state('');
  let busy = $state(false);
  let error = $state<string | null>(null);
  let validUrl = $derived(/^https?:\/\/\S+$/i.test(url.trim()));

  const close = () => (app.setImportOpen = false);

  async function run(load: () => Promise<string>) {
    busy = true;
    error = null;
    try {
      await load();
      close();
    } catch (err) {
      console.warn(err);
      error = err instanceof SetImportError ? t(`setImport.${err.reason}`) : t('setImport.invalid');
    }
    busy = false;
  }

  function onFile() {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    void run(async () => {
      if (file.size > MAX_ZIP_BYTES) throw new SetImportError('tooLarge');
      return app.importCardSet(new Uint8Array(await file.arrayBuffer()));
    });
  }

  function fromLink(e: SubmitEvent) {
    e.preventDefault();
    if (validUrl && !busy) void run(() => app.importCardSetFromUrl(url.trim()));
  }
</script>

<Modal label={t('importCardSet')} onclose={busy ? undefined : close}>
  <div class="import">
    <button class="big" onclick={() => fileInput.click()} disabled={busy} aria-label={t('loadZipFile')} title={t('loadZipFile')}>
      <FileArchive size={40} aria-hidden="true" />
      <span>{t('loadZipFile')}</span>
    </button>
    <input bind:this={fileInput} type="file" accept=".zip,application/zip" class="visually-hidden" tabindex="-1" onchange={onFile} />

    <form class="link" onsubmit={fromLink}>
      <label class="field">
        <Link size={20} aria-hidden="true" />
        <span class="visually-hidden">{t('link')}</span>
        <input type="url" bind:value={url} placeholder="https://…/cards.zip" inputmode="url" autocomplete="off" spellcheck="false" disabled={busy} />
      </label>
      <button type="submit" class="icon-btn primary" disabled={!validUrl || busy} aria-label={t('loadFromLink')} title={t('loadFromLink')}>
        {#if busy}<LoaderCircle class="spin" size={24} />{:else}<Link size={24} />{/if}
      </button>
    </form>

    {#if error}<p class="error" role="alert">{error}</p>{/if}

    <div class="actions">
      <button class="icon-btn" onclick={close} disabled={busy} aria-label={t('cancel')} title={t('cancel')}><X size={26} /></button>
    </div>
  </div>
</Modal>

<style>
  .import {
    display: grid;
    gap: clamp(10px, 2.5vmin, 18px);
    width: min(480px, 84vw);
  }
  .big {
    display: grid;
    justify-items: center;
    gap: 6px;
    padding: clamp(12px, 3vmin, 24px);
    border-radius: var(--radius);
    border: 3px dashed var(--muted);
    color: var(--green);
    font-weight: 700;
  }
  .big span {
    color: var(--text);
  }
  .big:hover:not(:disabled) {
    border-color: var(--green);
  }
  .link {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .field {
    flex: 1;
    min-width: 0;
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
  .field input {
    flex: 1;
    min-width: 0;
    padding: 10px 0;
    border: 0;
    outline: none;
    background: none;
    color: var(--text);
    font: inherit;
    user-select: text;
    -webkit-user-select: text;
  }
  .error {
    margin: 0;
    color: var(--bad);
    font-weight: 600;
    text-align: center;
  }
  .actions {
    display: flex;
  }
</style>
