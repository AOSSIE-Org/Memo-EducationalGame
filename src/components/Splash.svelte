<script lang="ts">
  /** Shown while the app starts; tapping it skips it. */
  import { t } from '../lib/i18n.svelte';

  let { onclose }: { onclose: () => void } = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="splash" onclick={onclose} role="presentation">
  <img class="logo" src="./memo-logo.svg" alt="" />
  <h1>Memo</h1>
  <p class="made-by">
    <span>{t('madeBy')}</span>
    <img class="aossie" src="./brand/aossie-secondary.svg" alt="AOSSIE" />
  </p>
</div>

<style>
  .splash {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: clamp(8px, 2.5vmin, 20px);
    background: var(--bg);
    color: var(--text);
    animation: fade-out 0.4s ease 3.6s forwards;
  }
  .logo {
    width: clamp(90px, 28vmin, 200px);
    height: auto;
    animation: pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  h1 {
    margin: 0;
    font-size: clamp(32px, 10vmin, 72px);
    font-weight: 900;
    letter-spacing: -0.02em;
    color: var(--gold);
    animation: rise 0.5s ease 0.15s both;
  }
  .made-by {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35em;
    margin: clamp(4px, 2vmin, 16px) 0 0;
    font-size: clamp(14px, 3vmin, 20px);
    font-weight: 600;
    color: var(--muted);
    animation: rise 0.5s ease 0.35s both;
  }
  .aossie {
    height: clamp(24px, 5.5vmin, 40px);
    width: auto;
  }
  @keyframes pop {
    from {
      transform: scale(0.5) rotate(-10deg);
      opacity: 0;
    }
  }
  @keyframes rise {
    from {
      transform: translateY(12px);
      opacity: 0;
    }
  }
  @keyframes fade-out {
    to {
      opacity: 0;
      visibility: hidden;
    }
  }
</style>
