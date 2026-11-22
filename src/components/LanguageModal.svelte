<script lang="ts">
  import { Check, X } from '@lucide/svelte';
  import { tick } from 'svelte';
  import { app } from '../lib/app.svelte';
  import { LANGUAGES, t, type LanguageCode } from '../lib/i18n.svelte';
  import { pickerOrder } from '../lib/languages';
  import Modal from './Modal.svelte';

  /** English first, then the others in alphabetical order of their own names. */
  const languages = pickerOrder(LANGUAGES);
  const close = () => (app.languageOpen = false);

  /** Text size (px) of the language buttons, the largest that fits on screen without scrolling. */
  const MAX_SIZE = 18;
  const MIN_SIZE = 7.5;
  let size = $state(MAX_SIZE);
  let picker = $state<HTMLDivElement>();

  async function fit() {
    const panel = picker?.closest<HTMLElement>('[role="dialog"]');
    if (!panel) return;
    for (let s = MAX_SIZE; s >= MIN_SIZE; s -= 0.5) {
      size = s;
      await tick();
      const words = [...picker!.querySelectorAll<HTMLElement>('.lang .name')].every((b) => b.scrollWidth <= b.clientWidth + 1);
      if (words && panel.scrollHeight <= panel.clientHeight + 1 && panel.scrollWidth <= panel.clientWidth + 1) return;
    }
  }

  $effect(() => {
    if (picker) void fit();
  });

  function choose(code: LanguageCode) {
    app.setSettings({ language: code });
    close();
  }
</script>

<svelte:window onresize={() => void fit()} />

<Modal label={t('language')} onclose={close} wide tight>
  <div class="picker" bind:this={picker} style:--size="{size}px">
    <div class="languages" role="radiogroup" aria-label={t('language')}>
      {#each languages as lang (lang.code)}
        {@const active = app.settings.language === lang.code}
        <button
          role="radio"
          aria-checked={active}
          class="lang"
          class:active
          lang={lang.code}
          dir={lang.dir}
          title={lang.english}
          onclick={() => choose(lang.code)}
        >
          <span class="name">{lang.name}</span>
          {#if active}<span class="tick" aria-hidden="true"><Check size="100%" strokeWidth={4} /></span>{/if}
        </button>
      {/each}
      <!-- The last cell, so that no header row takes height away from the languages. -->
      <button class="lang close" onclick={close} aria-label={t('close')} title={t('close')}>
        <X size="1.6em" />
      </button>
    </div>
  </div>
</Modal>

<style>
  .picker {
    display: grid;
    gap: clamp(6px, 1.6vmin, 12px);
    /* The dialog shrinks to its content, so the width must not depend on it. */
    width: min(880px, 92vw);
  }
  .languages {
    display: grid;
    /* Columns and buttons scale with the text size chosen by fit(). */
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--size) * 7.4), 1fr));
    gap: calc(var(--size) * 0.35);
  }
  .lang {
    position: relative;
    display: grid;
    place-items: center;
    min-width: 0;
    min-height: calc(var(--size) * 2.2);
    padding: 1px 4px;
    border-radius: var(--radius-sm, 10px);
    background: var(--surface);
    border: 2px solid transparent;
    font-size: var(--size);
    font-weight: 700;
    line-height: 1.1;
    text-align: center;
    text-wrap: balance;
    transition:
      transform 0.12s ease,
      border-color 0.12s ease;
  }
  /* Names break between words only; fit() shrinks the text if a word doesn't fit. */
  .name {
    display: block;
    width: 100%;
    overflow: hidden;
  }
  .lang:hover {
    border-color: var(--gold);
    transform: translateY(-1px);
  }
  .lang.close {
    background: var(--surface-2);
    color: var(--text);
  }
  .lang.active {
    border-color: var(--green);
  }
  .tick {
    position: absolute;
    top: -6px;
    inset-inline-end: -6px;
    width: 20px;
    height: 20px;
    padding: 3px;
    border-radius: 50%;
    background: var(--green);
    color: #fff;
  }
</style>
