<script lang="ts">
  import { Volume2 } from '@lucide/svelte';
  import { app, FLY_MS } from '../lib/app.svelte';
  import { hoverSpeech } from '../lib/hoverSpeech.svelte';
  import { bestGrid, type TableCard } from '../lib/memo';
  import { t } from '../lib/i18n.svelte';

  /** The table of cards: tap a card to turn it; two different cards turn back after a while or on a tap. */
  const GAP = 10;

  let area = $state<HTMLDivElement>();
  let size = $state({ w: 0, h: 0 });
  let labelH = $derived(Math.max(18, Math.min(44, size.h * 0.07)));

  $effect(() => {
    if (!area) return;
    const ro = new ResizeObserver(([e]) => (size = { w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(area);
    return () => ro.disconnect();
  });

  let game = $derived(app.game);
  let set = $derived(app.gameSet);
  let grid = $derived(game && set ? bestGrid(game.table.length, set.aspect, size.w, size.h, labelH, GAP) : null);
  const hover = hoverSpeech(() => app.game?.picked.length);

  /** The picture and description of a card. */
  const src = (card: TableCard) => set?.cards.find((c) => c.id === card.cardId)?.src ?? '';

  // The pair just found flies to the player's avatar (top right), shrinking until it disappears.
  const flown = new Set<string>();
  $effect(() => {
    if (!game) return;
    for (const card of game.table) {
      const id = `${game.id}:${card.key}`;
      if (card.state !== 'matched' || flown.has(id)) continue;
      flown.add(id);
      const el = document.querySelector<HTMLElement>(`[data-card-key="${card.key}"]`);
      const target = document.querySelector<HTMLElement>('[data-pair-target]');
      if (!el) continue;
      const from = el.getBoundingClientRect();
      const to = target?.getBoundingClientRect() ?? new DOMRect(innerWidth - 40, 10, 30, 30);
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1, zIndex: 30 },
          { transform: `translate(${dx * 0.35}px, ${dy * 0.35}px) scale(0.75)`, opacity: 1, zIndex: 30, offset: 0.35 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.06)`, opacity: 0, zIndex: 30 },
        ],
        { duration: reduce ? 1 : FLY_MS - 30, easing: 'cubic-bezier(0.5, 0, 0.75, 0.6)', fill: 'forwards' },
      );
    }
  });

  function onTable(e: PointerEvent) {
    // While two different cards are face up, a tap anywhere turns them back.
    if (app.game?.mismatch) {
      e.preventDefault();
      app.turnBack();
    }
  }
</script>

<svelte:window onpointerdown={app.game?.mismatch ? onTable : undefined} />

<div class="area" bind:this={area}>
  {#if game && set && grid && grid.cardWidth > 0}
    <ul
      class="table"
      aria-label={t('cards')}
      style:--cols={grid.cols}
      style:--card-w="{grid.cardWidth}px"
      style:--aspect={set.aspect}
      style:--label-h="{labelH}px"
      style:--gap="{GAP}px"
    >
      {#each game.table as card, i (`${game.id}:${card.key}`)}
        {@const up = card.state === 'up' || card.state === 'matched'}
        {@const d = set.describe(card.cardId)}
        <li class="cell" class:gone={card.state === 'gone'} class:flying={card.state === 'matched'}>
          <button
            class="card"
            class:up
            class:matched={card.state === 'matched'}
            class:wrong={up && game.mismatch}
            data-card-key={card.key}
            data-hover-speech={up ? '' : undefined}
            onclick={() => app.flip(card.key)}
            onpointerenter={(e) => up && hover.enter(e, d.text)}
            onpointerleave={hover.leave}
            aria-label={up ? d.text : t('faceDownCard', { n: i + 1 })}
            aria-disabled={card.state !== 'down'}
            disabled={card.state === 'gone'}
          >
            <span class="inner">
              <span class="face back" aria-hidden="true"><span class="motif"></span></span>
              <span class="face front" aria-hidden="true">
                {#if up || card.state === 'gone'}<img src={src(card)} alt="" draggable="false" class:pad={set.aspect === 1} />{/if}
              </span>
            </span>
          </button>
          <span class="label" lang={d.lang} aria-hidden={!up}>
            {#if up}
              <span class="text">{d.text}</span>
              <button class="say" onclick={() => app.speakCard(card.cardId)} aria-label={t('listen', { name: d.text })}>
                <Volume2 size="100%" />
              </button>
            {/if}
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .area {
    height: 100%;
    min-height: 0;
    display: grid;
    place-items: center;
  }
  .table {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(var(--cols), var(--card-w));
    gap: var(--gap);
    justify-content: center;
    align-content: center;
  }
  .cell {
    display: grid;
    grid-template-rows: auto var(--label-h);
    width: var(--card-w);
    perspective: 900px;
  }
  .card {
    position: relative;
    display: block;
    width: var(--card-w);
    aspect-ratio: var(--aspect);
    border-radius: clamp(6px, calc(var(--card-w) * 0.07), 14px);
    transition: transform 0.12s ease;
  }
  .card:not(.up):hover {
    transform: translateY(-3px);
  }
  .card:disabled {
    cursor: default;
  }
  .inner {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.45s cubic-bezier(0.4, 0.2, 0.2, 1);
  }
  .card.up .inner {
    transform: rotateY(180deg);
  }
  .face {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    overflow: hidden;
    border-radius: clamp(6px, calc(var(--card-w) * 0.07), 14px);
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.22);
  }
  /* The back of the cards, in AOSSIE green and gold. */
  .back {
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 50% 50%, rgb(255 255 255 / 0.12) 0 30%, transparent 31%),
      repeating-linear-gradient(45deg, rgb(255 205 0 / 0.16) 0 6px, transparent 6px 14px),
      var(--green);
    border: 3px solid var(--gold);
  }
  .motif {
    width: 34%;
    aspect-ratio: 1;
    border-radius: 22%;
    background: var(--gold);
    transform: rotate(45deg);
    box-shadow: inset 0 0 0 4px rgb(0 0 0 / 0.08);
  }
  .front {
    display: grid;
    place-items: center;
    background: #fff;
    transform: rotateY(180deg);
  }
  .front img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .front img.pad {
    padding: 8%;
  }
  .card.matched .front {
    box-shadow: 0 0 0 4px var(--ok), 0 4px 14px rgb(0 0 0 / 0.25);
  }
  .card.wrong .front {
    box-shadow: 0 0 0 4px var(--bad), 0 2px 6px rgb(0 0 0 / 0.22);
  }
  .card.wrong .inner {
    animation: shake 0.35s ease 0.45s;
  }
  .gone .card,
  .gone .label {
    visibility: hidden;
  }
  .flying .label {
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-width: 0;
    font-weight: 700;
    font-size: clamp(10px, calc(var(--label-h) * 0.38), 17px);
    line-height: 1.1;
    text-align: center;
  }
  .text {
    min-width: 0;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow-wrap: anywhere;
    animation: appear 0.3s ease 0.3s both;
  }
  /* On touch screens, a button to hear the card again (hover speaks with a mouse). */
  .say {
    display: none;
    flex-shrink: 0;
    width: 1.4em;
    height: 1.4em;
    padding: 0.15em;
    color: var(--green);
  }
  @media (hover: none) {
    .say {
      display: block;
    }
  }
  @keyframes appear {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
  }
  @keyframes shake {
    20%,
    60% {
      translate: -4px 0;
    }
    40%,
    80% {
      translate: 4px 0;
    }
  }
</style>
