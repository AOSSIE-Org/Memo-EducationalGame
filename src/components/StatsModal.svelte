<script lang="ts">
  import { Flame, Star, Trophy, X } from '@lucide/svelte';
  import { app } from '../lib/app.svelte';
  import { dayKey, lastDays } from '../lib/dates';
  import { num, t } from '../lib/i18n.svelte';
  import { byPairs, emptyScore } from '../lib/scores';
  import Modal from './Modal.svelte';
  import PairIcon from './PairIcon.svelte';

  const today = dayKey();
  let played = $derived(new Set(app.playDays));
  let days = $derived(lastDays(28, today));

  /** One row per card set, most pairs found first. Card sets are unbounded: the table scrolls. */
  let rows = $derived(
    app.user
      ? byPairs(
          app.sets.map((set) => ({
            set,
            score: app.user!.scores[set.id] ?? emptyScore(),
            picture: set.cards[0]?.src ?? '',
          })),
        )
      : [],
  );
</script>

<Modal label={t('statistics')} onclose={() => (app.statsOpen = false)} wide>
  {#if app.user}
    <div class="stats">
      <div class="top">
        <div class="streak" title={t('daysInARow')}>
          <Flame class="flame" size="1.6em" aria-hidden="true" />
          <span class="big" aria-label={t('scoreValue', { label: t('daysInARow'), value: app.dayStreak.current })}>
            {num(app.dayStreak.current)}
          </span>
          <span class="best" title={t('best')}>
            <Trophy size="1em" aria-label={t('best')} />{num(app.dayStreak.best)}
          </span>
        </div>
        <div class="calendar" role="img" aria-label={t('daysPlayed')} title={t('daysPlayed')}>
          {#each days as day (day)}
            <span class="day" class:on={played.has(day)} class:today={day === today} title={day}></span>
          {/each}
        </div>
      </div>

      <div class="scroll">
        <table>
          <colgroup>
            <col />
            <col class="c-num" />
            <col class="c-num" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col"><span class="visually-hidden">{t('cardSet')}</span></th>
              <th scope="col" title={t('pairsWithSet')}>
                <span class="head"><PairIcon /></span>
                <span class="visually-hidden">{t('pairsWithSet')}</span>
              </th>
              <th scope="col" title={t('gamesCompleted')}>
                <span class="head"><Star class="gold-star" aria-hidden="true" /></span>
                <span class="visually-hidden">{t('gamesCompleted')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {#each rows as r (r.set.id)}
              <tr class:played={r.score.pairs > 0}>
                <th scope="row" class="set" title={r.set.name}>
                  <span class="set-in">
                    <img src={r.picture} alt="" loading="lazy" />
                    <span class="set-name">{r.set.name}</span>
                  </span>
                </th>
                <td class="num">{num(r.score.pairs)}</td>
                <td class="num">{num(r.score.completed)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <button class="icon-btn close" onclick={() => (app.statsOpen = false)} aria-label={t('close')} title={t('close')}>
        <X size={26} />
      </button>
    </div>
  {/if}
</Modal>

<style>
  /* Fixed parts (streak, close button) around a table that scrolls on its own. */
  .stats {
    display: flex;
    flex-direction: column;
    gap: clamp(8px, 2vmin, 16px);
    width: min(720px, 90vw);
    max-height: calc(100dvh - 2 * var(--gutter) - 2 * clamp(12px, 3vmin, 28px));
  }
  .top {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: clamp(10px, 3vmin, 24px);
    padding: clamp(6px, 1.4vmin, 12px) clamp(10px, 2.4vmin, 18px);
    border-radius: var(--radius);
    background: var(--surface);
    flex-shrink: 0;
  }
  .streak {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: clamp(14px, 3.2vmin, 22px);
  }
  .streak :global(.flame) {
    color: #ff8200;
    fill: var(--gold);
  }
  .big {
    font-size: 1.8em;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
  }
  .best {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--muted);
    font-weight: 700;
  }
  .calendar {
    display: grid;
    grid-template-columns: repeat(14, 1fr);
    gap: clamp(2px, 0.6vmin, 5px);
  }
  .day {
    aspect-ratio: 1;
    max-height: 18px;
    border-radius: 4px;
    background: var(--surface-2);
  }
  .day.on {
    background: var(--green);
  }
  .day.today {
    outline: 2px solid var(--gold);
    outline-offset: 1px;
  }
  .scroll {
    min-height: 0;
    flex: 1 1 auto;
    overflow-y: auto;
    overscroll-behavior: contain;
    border-radius: var(--radius);
  }
  table {
    width: 100%;
    table-layout: fixed;
    border-collapse: separate;
    border-spacing: 0 clamp(4px, 1vmin, 6px);
  }
  .c-num {
    width: clamp(64px, 14vmin, 110px);
  }
  th,
  td {
    padding: clamp(4px, 1vmin, 8px) clamp(6px, 1.4vmin, 12px);
    vertical-align: middle;
    text-align: center;
  }
  /* The header stays visible while the rows scroll. */
  thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--bg);
    padding-block: 4px;
  }
  tbody th,
  tbody td {
    background: var(--surface);
  }
  tbody tr:not(.played) {
    opacity: 0.6;
  }
  tbody th {
    border-start-start-radius: var(--radius-sm);
    border-end-start-radius: var(--radius-sm);
  }
  tbody td:last-child {
    border-start-end-radius: var(--radius-sm);
    border-end-end-radius: var(--radius-sm);
  }
  .head {
    display: inline-flex;
    font-size: clamp(22px, 5vmin, 30px);
  }
  .head :global(svg) {
    width: 1em;
    height: 1em;
  }
  .head :global(.gold-star) {
    color: var(--gold);
    fill: var(--gold);
  }
  .set {
    text-align: start;
  }
  .set-in {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .set img {
    width: clamp(32px, 7vmin, 44px);
    aspect-ratio: 1;
    object-fit: contain;
    flex-shrink: 0;
    border-radius: 6px;
    background: #fff;
    box-shadow: 0 0 0 1px var(--border);
  }
  .set-name {
    min-width: 0;
    font-weight: 700;
    font-size: clamp(13px, 2.8vmin, 17px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .num {
    font-weight: 900;
    font-size: clamp(16px, 3.6vmin, 26px);
    font-variant-numeric: tabular-nums;
  }
  .close {
    align-self: flex-end;
    flex-shrink: 0;
  }
</style>
