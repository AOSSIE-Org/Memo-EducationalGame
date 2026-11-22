<script lang="ts">
  import { CircleCheck, Flame, Star } from '@lucide/svelte';
  import { app } from '../lib/app.svelte';
  import { num, t, type MessageKey } from '../lib/i18n.svelte';
  import PairIcon from './PairIcon.svelte';
  import RoundIcon from './RoundIcon.svelte';

  /** Scores with the current card set (the last one played, while choosing one). */
  let score = $derived(app.user?.scores[app.currentSetId] ?? { pairs: 0, completed: 0 });
  let rounds = $derived(app.user?.id !== undefined ? (app.gameRounds[app.user.id] ?? 0) : 0);
</script>

{#snippet chip(label: MessageKey, value: number, cls: string, icon: 'flame' | 'star' | 'round' | 'pair' | 'check')}
  <span class="chip {cls}" title={t(label)} aria-label={t('scoreValue', { label: t(label), value })}>
    {#if icon === 'flame'}<Flame aria-hidden="true" />{:else if icon === 'star'}<Star aria-hidden="true" />{:else if icon === 'round'}<RoundIcon />{:else if icon === 'pair'}<PairIcon />{:else}<CircleCheck
        aria-hidden="true"
      />{/if}{num(value)}
  </span>
{/snippet}

{#if app.user}
  <div class="streaks">
    {@render chip('daysInARow', app.dayStreak.current, 'flame', 'flame')}
    {@render chip('gamesCompleted', score.completed, 'gold-star', 'star')}
    {@render chip('roundsInGame', rounds, 'silver', 'round')}
    {@render chip('pairsWithSet', score.pairs, 'gold-pair', 'pair')}
    {@render chip('pairsInAll', app.user.correctCount, 'check', 'check')}
  </div>
{/if}

<style>
  .streaks {
    display: flex;
    align-items: center;
    gap: clamp(8px, 2vmin, 20px);
    min-width: 0;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.15em;
    font-weight: 900;
    font-size: clamp(20px, 5vmin, 36px);
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .chip :global(svg) {
    width: 1em;
    height: 1em;
    flex-shrink: 0;
  }
  .flame :global(svg) {
    color: #ff8200;
    fill: var(--gold);
  }
  .gold-star :global(svg) {
    color: var(--gold);
    fill: var(--gold);
  }
  .check :global(svg) {
    color: var(--green);
  }
</style>
