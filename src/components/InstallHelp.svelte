<script lang="ts">
  import { ArrowRight, EllipsisVertical, Share, SquarePlus, X, Smartphone } from '@lucide/svelte';
  import { install } from '../lib/install.svelte';
  import { t } from '../lib/i18n.svelte';
  import Modal from './Modal.svelte';

  const close = () => (install.helpOpen = false);
</script>

<Modal label={t('installTheApp')} onclose={close}>
  <div class="help">
    <img class="logo" src="./memo-logo.svg" alt="" />
    {#if install.platform === 'ios'}
      <!-- Safari: Share → Add to Home Screen -->
      <div class="steps">
        <span class="step"><Share aria-hidden="true" /><small>{t('iosShare')}</small></span>
        <ArrowRight class="arrow" aria-hidden="true" />
        <span class="step"><SquarePlus aria-hidden="true" /><small>{t('addToHomeScreen')}</small></span>
        <ArrowRight class="arrow" aria-hidden="true" />
        <span class="step"><Smartphone aria-hidden="true" /><small>Memo</small></span>
      </div>
    {:else}
      <!-- Browser menu → Install app / Add to Home screen -->
      <div class="steps">
        <span class="step"><EllipsisVertical aria-hidden="true" /><small>{t('browserMenu')}</small></span>
        <ArrowRight class="arrow" aria-hidden="true" />
        <span class="step"><SquarePlus aria-hidden="true" /><small>{t('installApp')}</small></span>
        <ArrowRight class="arrow" aria-hidden="true" />
        <span class="step"><Smartphone aria-hidden="true" /><small>Memo</small></span>
      </div>
    {/if}
    <button class="icon-btn" onclick={close} aria-label={t('close')} title={t('close')}><X size={26} /></button>
  </div>
</Modal>

<style>
  .help {
    display: grid;
    justify-items: center;
    gap: clamp(10px, 3vmin, 22px);
    width: min(560px, 86vw);
  }
  .logo {
    width: clamp(48px, 12vmin, 80px);
  }
  .steps {
    display: flex;
    align-items: center;
    gap: clamp(6px, 2vmin, 16px);
  }
  .step {
    display: grid;
    justify-items: center;
    gap: 6px;
    padding: clamp(8px, 2vmin, 14px);
    min-width: clamp(70px, 16vmin, 110px);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--green);
  }
  .step :global(svg) {
    width: clamp(28px, 7vmin, 40px);
    height: clamp(28px, 7vmin, 40px);
  }
  .step small {
    color: var(--text);
    font-weight: 600;
    font-size: clamp(11px, 2.4vmin, 14px);
    text-align: center;
  }
  .steps :global(.arrow) {
    color: var(--muted);
    flex-shrink: 0;
  }
</style>
