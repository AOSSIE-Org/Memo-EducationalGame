<script lang="ts">
  import { Languages } from '@lucide/svelte';
  import { app } from '../lib/app.svelte';
  import { t } from '../lib/i18n.svelte';

  /** Opens the language picker; shown in the player picker, before anyone has a menu. */
</script>

<button class="language" onclick={() => (app.languageOpen = true)} aria-label={t('language')} title={t('language')}>
  <Languages size={22} />
</button>

<style>
  .language {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: var(--green);
    background: var(--surface);
  }
  .language:hover {
    background: var(--surface-2);
  }
</style>
