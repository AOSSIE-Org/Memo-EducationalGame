<script lang="ts">
  import { AppWindow, RefreshCw } from '@lucide/svelte';
  import { t } from '../lib/i18n.svelte';
  import { applyUpdate, update } from '../lib/update.svelte';

  /**
   * ↻ when a new version is ready (lower-right corner, next to full screen);
   * a full-screen notice when this copy is outdated or another copy is in the way.
   */
  let updating = $state(false);

  function start() {
    updating = true;
    void applyUpdate();
  }
</script>

{#if update.outdated}
  <div class="notice" role="alertdialog" aria-label={t('updateRequired')}>
    <img class="logo" src="./memo-logo.svg" alt="" />
    <p>{t('updateRequired')}</p>
    <button class="big" class:spin={updating} onclick={start} aria-label={t('updateAvailable')} title={t('updateAvailable')}>
      <RefreshCw size="55%" strokeWidth={2.5} />
    </button>
  </div>
{:else if update.blocked}
  <div class="notice" role="alert">
    <img class="logo" src="./memo-logo.svg" alt="" />
    <AppWindow class="window" aria-hidden="true" />
    <p>{t('closeOtherCopies')}</p>
  </div>
{:else if update.available}
  <button class="corner" class:spin={updating} onclick={start} aria-label={t('updateAvailable')} title={t('updateAvailable')}>
    <RefreshCw size="100%" strokeWidth={2.5} />
  </button>
{/if}

<style>
  .corner {
    position: fixed;
    right: calc(max(6px, env(safe-area-inset-right)) + 38px);
    bottom: max(6px, env(safe-area-inset-bottom));
    z-index: 30;
    width: 34px;
    height: 34px;
    padding: 7px;
    border-radius: 50%;
    background: var(--gold);
    color: var(--ink);
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.25);
    animation: pulse 2s ease-in-out infinite;
  }
  .notice {
    position: fixed;
    inset: 0;
    z-index: 110;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: clamp(10px, 3vmin, 24px);
    padding: var(--gutter, 16px);
    background: var(--bg);
    color: var(--text);
    text-align: center;
  }
  .logo {
    width: clamp(70px, 18vmin, 130px);
  }
  .notice p {
    margin: 0;
    max-width: 32ch;
    font-size: clamp(16px, 3.6vmin, 24px);
    font-weight: 700;
  }
  .notice :global(.window) {
    width: clamp(36px, 9vmin, 56px);
    height: clamp(36px, 9vmin, 56px);
    color: var(--muted);
  }
  .big {
    display: grid;
    place-items: center;
    width: clamp(64px, 16vmin, 96px);
    height: clamp(64px, 16vmin, 96px);
    border-radius: 50%;
    background: var(--gold);
    color: var(--ink);
    box-shadow: var(--shadow);
  }
  .spin :global(svg) {
    animation: spin 1s linear infinite;
  }
  @keyframes pulse {
    50% {
      transform: scale(1.12);
    }
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
