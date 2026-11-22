<script lang="ts">
  import { Check, Pencil, X } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { app, type EditorMode } from '../lib/app.svelte';
  import { coloredShapeName, shapeName, t } from '../lib/i18n.svelte';
  import { COLORS, COLOR_IDS, SHAPES, type ColorId } from '../lib/shapes';
  import type { Avatar as AvatarData } from '../lib/types';
  import Avatar from './Avatar.svelte';
  import Modal from './Modal.svelte';

  let { mode }: { mode: EditorMode } = $props();

  const palette = COLOR_IDS.map((id) => ({ id, hex: COLORS[id] as string }));
  function randomAvatar(): AvatarData {
    const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
    return { shape: pick(SHAPES), color: pick(palette.filter((c) => c.id !== 'white')).hex };
  }

  // The editor works on a copy of the initial values.
  const initial = untrack(() =>
    mode === 'edit' && app.user
      ? { name: app.user.name, avatar: $state.snapshot(app.user.avatar) as AvatarData }
      : { name: '', avatar: randomAvatar() },
  );
  let name = $state(initial.name);
  let avatar = $state<AvatarData>(initial.avatar);
  let saving = $state(false);
  let valid = $derived(name.trim().length > 0);
  let colorId = $derived(palette.find((c) => c.hex === avatar.color)?.id as ColorId | undefined);
  let label = $derived(colorId ? coloredShapeName(colorId, avatar.shape) : shapeName(avatar.shape));
  let canCancel = $derived(mode === 'edit' || app.users.length > 0);

  function cancel() {
    app.editor = null;
  }

  async function save() {
    if (!valid || saving) return;
    saving = true;
    const snapshot = $state.snapshot(avatar) as AvatarData;
    if (mode === 'edit') await app.updateUser(name.trim(), snapshot);
    else await app.createUser(name.trim(), snapshot);
    saving = false;
  }
</script>

<Modal label={mode === 'edit' ? t('editPlayer') : t('newPlayer')} onclose={canCancel ? cancel : undefined} wide>
  <form class="editor" onsubmit={(e) => (e.preventDefault(), save())}>
    <div class="left">
      <div class="preview" title={label}><Avatar {avatar} /></div>
      <label class="name">
        <Pencil size={20} aria-hidden="true" />
        <span class="visually-hidden">{t('name')}</span>
        <input bind:value={name} maxlength="16" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" />
      </label>
    </div>

    <div class="right">
      <div class="shapes" role="radiogroup" aria-label={t('shape')}>
        {#each SHAPES as shape (shape)}
          <button
            type="button"
            role="radio"
            aria-checked={avatar.shape === shape}
            aria-label={shapeName(shape)}
            title={shapeName(shape)}
            class="shape"
            class:active={avatar.shape === shape}
            onclick={() => (avatar.shape = shape)}
          >
            <Avatar {avatar} {shape} />
          </button>
        {/each}
      </div>

      <div class="palette" role="radiogroup" aria-label={t('colours')}>
        {#each palette as c (c.id)}
          <button
            type="button"
            role="radio"
            aria-checked={avatar.color === c.hex}
            aria-label={coloredShapeName(c.id, avatar.shape)}
            title={coloredShapeName(c.id, avatar.shape)}
            class="swatch"
            class:active={avatar.color === c.hex}
            style:background={c.hex}
            onclick={() => (avatar.color = c.hex)}
          ></button>
        {/each}
        <!-- Any other colour, with the system colour picker. -->
        <label class="swatch custom" class:active={!colorId} style:--custom={!colorId ? avatar.color : null} title={t('otherColour')}>
          <span class="visually-hidden">{t('otherColour')}</span>
          <input type="color" value={avatar.color.toLowerCase()} oninput={(e) => (avatar.color = e.currentTarget.value.toUpperCase())} />
        </label>
      </div>
    </div>

    <div class="actions">
      {#if canCancel}
        <button type="button" class="icon-btn" onclick={cancel} aria-label={t('cancel')} title={t('cancel')}>
          <X size={28} />
        </button>
      {:else}
        <span></span>
      {/if}
      <button type="submit" class="icon-btn primary" disabled={!valid || saving} aria-label={t('save')} title={t('save')}>
        <Check size={32} strokeWidth={3} />
      </button>
    </div>
  </form>
</Modal>

<style>
  .editor {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.4fr);
    grid-template-areas: 'left right' 'actions actions';
    gap: clamp(10px, 3vmin, 24px);
    width: min(860px, 88vw);
  }
  .left,
  .right {
    min-width: 0;
    grid-template-columns: minmax(0, 1fr);
  }
  .left {
    grid-area: left;
    display: grid;
    align-content: center;
    gap: clamp(8px, 2.5vmin, 18px);
  }
  .preview {
    width: min(100%, 34dvh);
    justify-self: center;
    padding: 6%;
    border-radius: var(--radius);
    background: var(--paper);
    box-shadow: inset 0 0 0 1px var(--border);
  }
  .name {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border-radius: var(--radius-sm);
    background: var(--surface);
    border: 2px solid var(--border);
    color: var(--muted);
  }
  .name:focus-within {
    border-color: var(--focus);
  }
  .name input {
    flex: 1;
    min-width: 0;
    padding: clamp(6px, 1.6vmin, 12px) 0;
    border: 0;
    outline: none;
    background: none;
    color: var(--text);
    font: inherit;
    font-size: clamp(16px, 3.4vmin, 24px);
    font-weight: 600;
    user-select: text;
    -webkit-user-select: text;
  }
  .right {
    grid-area: right;
    display: grid;
    align-content: center;
    gap: clamp(8px, 2.2vmin, 16px);
  }
  .shapes {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: clamp(3px, 1vmin, 8px);
  }
  .shape {
    border-radius: 8px;
    padding: 3px;
    background: var(--paper);
    box-shadow: inset 0 0 0 1px var(--border);
    max-height: 9dvh;
    display: grid;
    place-items: center;
  }
  .shape :global(svg) {
    width: 100%;
    max-height: calc(9dvh - 6px);
  }
  .shape.active {
    outline: 3px solid var(--text);
    outline-offset: 1px;
  }
  .palette {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: clamp(5px, 1.4vmin, 10px);
  }
  .swatch {
    aspect-ratio: 1;
    border-radius: 50%;
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--text) 25%, transparent);
    transition: transform 0.1s ease;
    width: 100%;
    max-width: 7.5dvh;
    justify-self: center;
  }
  .swatch.custom {
    position: relative;
    cursor: pointer;
    background: conic-gradient(red, yellow, lime, cyan, blue, magenta, red);
  }
  .swatch.custom[style*='--custom'] {
    background:
      radial-gradient(circle, var(--custom) 52%, transparent 54%),
      conic-gradient(red, yellow, lime, cyan, blue, magenta, red);
  }
  .swatch.custom input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    border: 0;
    padding: 0;
  }
  .swatch.custom:focus-within {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }
  .swatch.active {
    outline: 3px solid var(--text);
    outline-offset: 2px;
    transform: scale(1.08);
  }
  .actions {
    grid-area: actions;
    display: flex;
    justify-content: space-between;
  }
</style>
