<script lang="ts">
  import { GalleryHorizontalEnd, PartyPopper, RotateCcw } from '@lucide/svelte';
  import { app } from '../lib/app.svelte';
  import { num, t } from '../lib/i18n.svelte';
  import Avatar from './Avatar.svelte';
  import PairIcon from './PairIcon.svelte';

  /** All pairs found: who found how many, then play again or choose other cards. */
  let rows = $derived(
    [...app.players]
      .map((p) => ({ p, pairs: app.gamePairs[p.id!] ?? 0 }))
      .sort((a, b) => b.pairs - a.pairs),
  );
  let top = $derived(rows[0]?.pairs ?? 0);
</script>

<div class="over" role="dialog" aria-modal="true" aria-label={t('allPairsFound')}>
  <div class="card">
    <PartyPopper class="party" aria-hidden="true" />
    <h2>{t('allPairsFound')}</h2>
    <ol class="players">
      {#each rows as { p, pairs } (p.id)}
        <li class:winner={app.multiplayer && pairs === top}>
          <span class="avatar"><Avatar avatar={p.avatar} /></span>
          <span class="name">{p.name}</span>
          <span class="pairs" aria-label={t('pairsFound', { n: pairs })}><PairIcon />{num(pairs)}</span>
        </li>
      {/each}
    </ol>
    <div class="actions">
      <button class="icon-btn" onclick={() => app.changeGame()} aria-label={t('changeCards')} title={t('changeCards')}>
        <GalleryHorizontalEnd size={26} />
      </button>
      <button class="icon-btn primary" onclick={() => app.playAgain()} aria-label={t('playAgain')} title={t('playAgain')}>
        <RotateCcw size={28} strokeWidth={3} />
      </button>
    </div>
  </div>
</div>

<style>
  .over {
    position: fixed;
    inset: 0;
    z-index: 9;
    display: grid;
    place-items: center;
    padding: var(--gutter);
    background: var(--scrim);
    animation: fade 0.3s ease;
  }
  .card {
    display: grid;
    justify-items: center;
    gap: clamp(6px, 2vmin, 16px);
    max-height: 100%;
    overflow: auto;
    padding: clamp(14px, 4vmin, 32px) clamp(20px, 6vmin, 48px);
    border-radius: var(--radius);
    background: var(--bg);
    box-shadow: var(--shadow);
    animation: pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .card :global(.party) {
    width: clamp(40px, 12vmin, 80px);
    height: clamp(40px, 12vmin, 80px);
    color: var(--gold-edge);
  }
  h2 {
    margin: 0;
    font-size: clamp(22px, 6vmin, 40px);
    font-weight: 900;
    color: var(--green);
    text-align: center;
  }
  .players {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 4px 12px;
    border-radius: 999px;
    background: var(--surface);
  }
  li.winner {
    outline: 3px solid var(--gold);
  }
  .avatar {
    width: clamp(26px, 6vmin, 40px);
  }
  .name {
    font-weight: 800;
    font-size: clamp(15px, 3.4vmin, 22px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pairs {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 900;
    font-size: clamp(16px, 3.6vmin, 24px);
    font-variant-numeric: tabular-nums;
  }
  .actions {
    display: flex;
    justify-content: space-between;
    width: 100%;
    min-width: 200px;
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @keyframes pop {
    from {
      transform: scale(0.6);
      opacity: 0;
    }
  }
</style>
