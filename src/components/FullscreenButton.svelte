<script lang="ts">
  import { Maximize, Minimize } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { t } from '../lib/i18n.svelte';

  /** Discreet full-screen toggle (hidden where the Fullscreen API isn't available, e.g. iPhone Safari). */
  type Doc = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
  type El = HTMLElement & { webkitRequestFullscreen?: () => void };

  const doc = document as Doc;
  const supported = !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
  let active = $state(false);

  const update = () => (active = !!(doc.fullscreenElement || doc.webkitFullscreenElement));

  onMount(() => {
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    return () => {
      document.removeEventListener('fullscreenchange', update);
      document.removeEventListener('webkitfullscreenchange', update);
    };
  });

  async function toggle() {
    try {
      if (active) {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else doc.webkitExitFullscreen?.();
      } else {
        const el = document.documentElement as El;
        if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
        else el.webkitRequestFullscreen?.();
      }
    } catch {
      // Refused by the browser: nothing to do.
    }
  }
</script>

{#if supported}
  <button
    class="fullscreen"
    onclick={toggle}
    aria-label={active ? t('exitFullScreen') : t('fullScreen')}
    title={active ? t('exitFullScreen') : t('fullScreen')}
  >
    {#if active}<Minimize size="100%" />{:else}<Maximize size="100%" />{/if}
  </button>
{/if}

<style>
  .fullscreen {
    position: fixed;
    right: max(6px, env(safe-area-inset-right));
    bottom: max(6px, env(safe-area-inset-bottom));
    z-index: 12;
    width: 30px;
    height: 30px;
    padding: 6px;
    border-radius: 8px;
    color: var(--muted);
    opacity: 0.45;
    transition: opacity 0.15s ease;
  }
  .fullscreen:hover,
  .fullscreen:focus-visible {
    opacity: 1;
    background: var(--surface);
  }
</style>
