<script lang="ts">
  import { Check, Minus, Pencil, Plus, Repeat, Timer, Trash2, Upload, Users, X } from '@lucide/svelte';
  import { app } from '../lib/app.svelte';
  import { sample } from '../lib/cardsets';
  import { hoverSpeech } from '../lib/hoverSpeech.svelte';
  import { i18n, num, t } from '../lib/i18n.svelte';
  import type { CardSetView, PlayCard } from '../lib/sets';
  import { MIN_SET_CARDS } from '../lib/setzip';
  import { PAIR_OPTIONS, SHOW_SECONDS_MAX, SHOW_SECONDS_MIN, TURN_ROUNDS_MAX, TURN_ROUNDS_MIN } from '../lib/types';
  import DeleteConfirm from './DeleteConfirm.svelte';
  import Modal from './Modal.svelte';

  /** Sample cards shown on each tile: four, chosen at random each time the picker opens. */
  const SAMPLE_SIZE = 4;
  const samples = new Map<string, PlayCard[]>();
  function samplesOf(set: CardSetView): PlayCard[] {
    let s = samples.get(set.id);
    // A set edited meanwhile may have lost the sampled cards.
    if (!s || s.some((c) => !set.cards.some((x) => x.id === c.id && x.src === c.src))) {
      s = sample(set.cards, SAMPLE_SIZE);
      samples.set(set.id, s);
    }
    return s;
  }

  const hover = hoverSpeech(() => app.phase);
  const same = (a: string, b: string) => i18n.collator.compare(a, b) === 0 || a.toLocaleLowerCase() === b.toLocaleLowerCase();

  /** Every topic of every set, without duplicates, in alphabetical order. */
  let topics = $derived.by(() => {
    const all: string[] = [];
    for (const set of app.sets) for (const tag of set.tags) if (!all.some((x) => same(x, tag))) all.push(tag);
    return all.sort(i18n.collator.compare);
  });
  let topic = $derived(app.topic && topics.find((x) => same(x, app.topic!)) ? app.topic : null);
  let shown = $derived(topic ? app.sets.filter((s) => s.tags.some((tag) => same(tag, topic!))) : app.sets);
  let hasCustom = $derived(app.sets.some((s) => s.custom));

  let deleting = $state(false);
  let toDelete = $state<CardSetView | null>(null);
  /** A set just loaded, highlighted. */
  let fresh = $derived(app.customSets.reduce((a, s) => (s.createdAt > a.at ? { id: s.id, at: s.createdAt } : a), { id: '', at: Date.now() - 4000 }).id);

  function pick(set: CardSetView) {
    if (deleting) {
      if (set.custom && set.id !== app.game?.setId) toDelete = set;
      return;
    }
    if (set.cards.length >= MIN_SET_CARDS) app.startGame(set.id);
  }

  async function confirmDelete() {
    if (toDelete) await app.deleteCardSet(toDelete.id);
    toDelete = null;
    if (!app.sets.some((s) => s.custom)) deleting = false;
  }

  const step = (key: 'showSeconds' | 'turnRounds', by: number) => app.setSettings({ [key]: app.settings[key] + by });
</script>

<Modal label={t('chooseCards')} onclose={app.game ? () => (app.phase = 'playing') : undefined} wide>
  <div class="picker">
    {#if topics.length}
      <div class="topics" role="radiogroup" aria-label={t('topics')}>
        <button role="radio" aria-checked={!topic} class="topic" class:active={!topic} onclick={() => (app.topic = null)}>
          {t('allTopics')}
        </button>
        {#each topics as tag (tag)}
          <button role="radio" aria-checked={topic === tag} class="topic" class:active={topic === tag} onclick={() => (app.topic = tag)}>
            {tag}
          </button>
        {/each}
      </div>
    {/if}

    <ul class="sets" aria-label={t('cardSets')}>
      {#each shown as set (set.id)}
        {@const playable = set.cards.length >= MIN_SET_CARDS}
        <li class="slot">
          <button
            class="tile"
            class:fresh={set.id === fresh}
            class:current={set.id === app.currentSetId && !deleting}
            class:deleting={deleting && set.custom}
            class:dimmed={(deleting && !set.custom) || !playable}
            data-hover-speech
            onpointerenter={(e) => hover.enter(e, set.name)}
            onpointerleave={hover.leave}
            onclick={() => pick(set)}
            aria-label={set.name}
            title={playable ? set.name : t('notEnoughCards')}
          >
            <span class="samples" style:--aspect={set.aspect}>
              {#each samplesOf(set) as card (card.id)}
                <span class="sample"><img src={card.src} alt="" loading="lazy" draggable="false" /></span>
              {/each}
            </span>
            <span class="name">{set.name}</span>
            <span class="count" aria-label={t('cardCount', { n: set.cards.length })}>{num(set.cards.length)}</span>
            {#if deleting && set.custom}
              <span class="tick remove" aria-hidden="true"><X size="100%" strokeWidth={4} /></span>
            {/if}
          </button>
          {#if set.custom && !deleting}
            <button class="edit" onclick={() => (app.setEditor = set.id)} aria-label={t('editCardSet')} title={t('editCardSet')}>
              <Pencil size="100%" />
            </button>
          {/if}
        </li>
      {/each}
      {#if !deleting}
        <li class="slot">
          <button class="tile add" onclick={() => (app.setEditor = '')} aria-label={t('newCardSet')} title={t('newCardSet')}>
            <span class="plus"><Plus size="50%" strokeWidth={3} /></span>
            <span class="name" aria-hidden="true">&nbsp;</span>
          </button>
        </li>
      {/if}
    </ul>

    <div class="settings" role="group" aria-label={t('gameSettings')}>
      <div class="grids" role="radiogroup" aria-label={t('pairs')} title={t('pairs')}>
        {#each PAIR_OPTIONS as o (o.pairs)}
          <button
            role="radio"
            aria-checked={app.settings.pairs === o.pairs}
            class="grid-option"
            class:active={app.settings.pairs === o.pairs}
            onclick={() => app.setSettings({ pairs: o.pairs })}
            aria-label={t('pairsValue', { n: o.pairs })}
            title={t('pairsValue', { n: o.pairs })}
          >
            <svg viewBox="0 0 {o.cols * 10} {o.rows * 13}" aria-hidden="true">
              {#each { length: o.cols * o.rows } as _, i (i)}
                <rect x={(i % o.cols) * 10 + 1} y={Math.floor(i / o.cols) * 13 + 1} width="8" height="11" rx="1.6" />
              {/each}
            </svg>
          </button>
        {/each}
      </div>

      <div class="steppers">
        {@render stepper('showSeconds', 'showTime', 'fewerSeconds', 'moreSeconds', SHOW_SECONDS_MIN, SHOW_SECONDS_MAX)}
        {#if app.multiplayer}
          {@render stepper('turnRounds', 'roundsPerPlayer', 'fewerRounds', 'moreRounds', TURN_ROUNDS_MIN, TURN_ROUNDS_MAX)}
        {/if}
      </div>
    </div>

    <div class="footer">
      <button class="icon-btn" onclick={() => (app.setImportOpen = true)} aria-label={t('importCardSet')} title={t('importCardSet')}>
        <Upload size={24} />
      </button>
      {#if hasCustom}
        <button
          class="bin"
          class:active={deleting}
          onclick={() => (deleting = !deleting)}
          aria-pressed={deleting}
          aria-label={t('deleteCardSets')}
          title={t('deleteCardSets')}
        >
          <Trash2 size="100%" />
        </button>
      {/if}
      <button class="icon-btn players" onclick={() => app.switchUser()} aria-label={t('switchPlayer')} title={t('switchPlayer')}>
        <Users size={24} />
      </button>
      {#if app.game}
        <button class="icon-btn close" onclick={() => (app.phase = 'playing')} aria-label={t('close')} title={t('close')}>
          <Check size={26} />
        </button>
      {/if}
    </div>
  </div>
</Modal>

{#snippet stepper(
  key: 'showSeconds' | 'turnRounds',
  label: 'showTime' | 'roundsPerPlayer',
  less: 'fewerSeconds' | 'fewerRounds',
  more: 'moreSeconds' | 'moreRounds',
  min: number,
  max: number,
)}
  <div class="stepper" role="group" aria-label={t(label)} title={t(label)}>
    {#if key === 'showSeconds'}<Timer class="stepper-icon" aria-hidden="true" />{:else}<Repeat class="stepper-icon" aria-hidden="true" />{/if}
    <button onclick={() => step(key, -1)} disabled={app.settings[key] <= min} aria-label={t(less)} title={t(less)}>
      <Minus size={18} />
    </button>
    <output aria-label={t(label)}>{num(app.settings[key])}</output>
    <button onclick={() => step(key, 1)} disabled={app.settings[key] >= max} aria-label={t(more)} title={t(more)}>
      <Plus size={18} />
    </button>
  </div>
{/snippet}

{#if toDelete}
  {@const set = toDelete}
  <DeleteConfirm
    label={t('deleteCardSet', { name: set.name })}
    hint={t('grownUpsOnlyCards')}
    name={set.name}
    onconfirm={confirmDelete}
    oncancel={() => (toDelete = null)}
  >
    <span class="del-samples">
      {#each samplesOf(set).slice(0, 2) as card (card.id)}<img src={card.src} alt="" />{/each}
    </span>
  </DeleteConfirm>
{/if}

<style>
  .picker {
    display: flex;
    flex-direction: column;
    gap: clamp(6px, 1.6vmin, 14px);
    width: min(940px, 90vw);
    /* The modal never grows taller than the screen: the list of sets scrolls. */
    max-height: calc(100dvh - 2 * var(--gutter) - 2 * clamp(12px, 3vmin, 28px));
  }
  .topics {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    flex-shrink: 0;
    padding: 2px;
    scrollbar-width: thin;
  }
  .topic {
    flex-shrink: 0;
    padding: 4px 12px;
    border-radius: 999px;
    background: var(--surface);
    font-weight: 600;
    font-size: clamp(12px, 2.4vmin, 15px);
    white-space: nowrap;
    color: var(--muted);
  }
  .topic.active {
    background: var(--green);
    color: #fff;
  }
  .sets {
    list-style: none;
    margin: 0;
    padding: 8px 4px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(clamp(118px, 22vmin, 170px), 1fr));
    gap: clamp(8px, 2vmin, 16px);
    overflow-y: auto;
    min-height: 0;
    flex: 1 1 auto;
    overscroll-behavior: contain;
  }
  .slot {
    position: relative;
  }
  .tile {
    position: relative;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 6px;
    justify-items: center;
    padding: 8px;
    border-radius: var(--radius);
    background: var(--surface);
    border: 3px solid transparent;
    transition:
      transform 0.12s ease,
      border-color 0.12s ease;
  }
  .tile:hover:not(.dimmed) {
    transform: translateY(-3px);
    border-color: var(--gold);
  }
  .tile.current {
    border-color: var(--green);
  }
  .tile.dimmed {
    opacity: 0.5;
  }
  .tile.fresh {
    outline: 3px solid var(--gold);
    animation: pop 0.35s ease;
  }
  .tile.deleting {
    animation: wiggle 0.6s ease-in-out infinite;
  }
  .samples {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
    width: 100%;
  }
  .sample {
    display: grid;
    place-items: center;
    aspect-ratio: 1;
    border-radius: 6px;
    background: #fff;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.18);
    overflow: hidden;
  }
  .sample img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .samples[style*='--aspect: 1;'] .sample img,
  .samples[style*='--aspect:1;'] .sample img {
    padding: 6%;
  }
  .name {
    align-self: center;
    max-width: 100%;
    font-weight: 700;
    font-size: clamp(12px, 2.3vmin, 15px);
    line-height: 1.2;
    text-align: center;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow-wrap: anywhere;
  }
  .count {
    position: absolute;
    top: 4px;
    inset-inline-start: 4px;
    padding: 1px 6px;
    border-radius: 999px;
    background: var(--bg);
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    box-shadow: 0 0 0 1px var(--border);
  }
  /* Small edit button in the top right corner of custom sets. */
  .edit {
    position: absolute;
    top: -6px;
    inset-inline-end: -6px;
    width: 30px;
    height: 30px;
    padding: 7px;
    border-radius: 50%;
    background: var(--bg);
    color: var(--green);
    box-shadow: 0 0 0 1px var(--border), 0 2px 6px rgb(0 0 0 / 0.15);
  }
  .edit:hover {
    background: var(--green);
    color: #fff;
  }
  .tick {
    position: absolute;
    top: -8px;
    inset-inline-end: -8px;
    width: 24px;
    height: 24px;
    padding: 3px;
    border-radius: 50%;
    color: #fff;
  }
  .tick.remove {
    background: var(--bad);
  }
  .add {
    color: var(--green);
  }
  .plus {
    display: grid;
    place-items: center;
    width: 100%;
    aspect-ratio: 1;
    border-radius: 8px;
    border: 3px dashed var(--muted);
  }
  .settings {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 16px;
    flex-shrink: 0;
  }
  .grids {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .grid-option {
    display: grid;
    place-items: center;
    width: clamp(34px, 7vmin, 46px);
    height: clamp(30px, 6vmin, 40px);
    padding: 4px;
    border-radius: 8px;
    color: var(--muted);
  }
  .grid-option svg {
    max-width: 100%;
    max-height: 100%;
    fill: currentColor;
  }
  .grid-option:hover {
    background: var(--surface-2);
  }
  .grid-option.active {
    background: var(--green);
    color: #fff;
  }
  .steppers {
    display: flex;
    gap: 8px;
  }
  .stepper {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 6px;
    border-radius: 999px;
    background: var(--surface);
    color: var(--green);
  }
  .stepper button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    color: var(--text);
  }
  .stepper button:hover:not(:disabled) {
    background: var(--surface-2);
  }
  .stepper button:disabled {
    opacity: 0.35;
  }
  .stepper output {
    min-width: 2ch;
    text-align: center;
    font-weight: 900;
    font-size: 20px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .footer {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  .footer .players {
    margin-inline-start: auto;
  }
  .footer .close {
    background: var(--green);
    color: #fff;
  }
  /* Deliberately small and faded: not meant for children. */
  .bin {
    width: 26px;
    height: 26px;
    padding: 5px;
    border-radius: 6px;
    color: var(--muted);
    opacity: 0.4;
  }
  .bin:hover,
  .bin.active {
    opacity: 1;
  }
  .bin.active {
    background: var(--bad);
    color: #fff;
  }
  .del-samples {
    display: flex;
    gap: 4px;
  }
  .del-samples img {
    width: clamp(32px, 8vmin, 48px);
    aspect-ratio: 1;
    object-fit: contain;
    background: #fff;
    border-radius: 4px;
  }
  @keyframes wiggle {
    0%,
    100% {
      transform: rotate(-1.5deg);
    }
    50% {
      transform: rotate(1.5deg);
    }
  }
  @keyframes pop {
    0% {
      transform: scale(0.9);
    }
    60% {
      transform: scale(1.05);
    }
  }
  /* Short screens: fewer rows of sets, all controls still visible. */
  @media (max-height: 480px) {
    .sets {
      grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
    }
  }
</style>
