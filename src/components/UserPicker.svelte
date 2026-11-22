<script lang="ts">
  import { Check, FolderDown, Play, Plus, Trash2, Upload, User as UserIcon, Users, X } from '@lucide/svelte';
  import { app } from '../lib/app.svelte';
  import { ImportError, MAX_IMPORT_BYTES } from '../lib/transfer';
  import type { User } from '../lib/types';
  import { t } from '../lib/i18n.svelte';
  import Avatar from './Avatar.svelte';
  import LanguageButton from './LanguageButton.svelte';
  import DeleteConfirm from './DeleteConfirm.svelte';
  import Modal from './Modal.svelte';

  let fileInput: HTMLInputElement;
  let importError = $state<string | null>(null);
  /** Players just loaded from a file, highlighted. */
  let imported = $state<number[]>([]);
  let errorTimer: ReturnType<typeof setTimeout> | undefined;

  let multi = $derived(app.pickerMode === 'multi');
  let selectedCount = $derived(app.users.filter((u) => u.id !== undefined && app.selectedIds.includes(u.id)).length);

  /** Delete mode: tapping a player asks to delete it (after a grown-ups-only check). */
  let deleting = $state(false);
  let toDelete = $state<User | null>(null);

  async function confirmDelete() {
    if (toDelete?.id !== undefined) await app.deleteUser(toDelete.id);
    toDelete = null;
    if (app.users.length === 0) {
      deleting = false;
      app.editor = 'new';
    }
  }

  function pick(user: User) {
    if (deleting) {
      toDelete = user;
      return;
    }
    if (multi) {
      if (user.id !== undefined) app.toggleSelected(user.id);
    } else {
      void app.startSession([user]);
    }
  }

  async function onFile() {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new ImportError('tooLarge');
      const users = await app.importFile(await file.text());
      imported = users.flatMap((u) => (u.id !== undefined ? [u.id] : []));
      importError = null;
    } catch (err) {
      importError = err instanceof ImportError ? t(`import.${err.reason}`) : t('import.failed');
      clearTimeout(errorTimer);
      errorTimer = setTimeout(() => (importError = null), 3000);
    }
  }
</script>

<Modal label={t('whoIsPlaying')}>
  <div class="mode" role="radiogroup" aria-label={t('players')}>
    <button
      role="radio"
      aria-checked={!multi}
      class:active={!multi}
      onclick={() => app.setPickerMode('single')}
      aria-label={t('onePlayer')}
      title={t('onePlayer')}
    >
      <UserIcon />
    </button>
    <button
      role="radio"
      aria-checked={multi}
      class:active={multi}
      onclick={() => app.setPickerMode('multi')}
      aria-label={t('severalPlayers')}
      title={t('severalPlayers')}
    >
      <Users />
    </button>
  </div>

  <ul class="users">
    {#each app.users as user (user.id)}
      {@const selected = multi && user.id !== undefined && app.selectedIds.includes(user.id)}
      <li>
        <button
          class="tile"
          class:new={user.id !== undefined && imported.includes(user.id)}
          class:selected
          class:dimmed={multi && !selected && !deleting}
          class:deleting
          aria-pressed={multi ? selected : undefined}
          onclick={() => pick(user)}
          aria-label={user.name}
        >
          <Avatar avatar={user.avatar} class="tile-flag" />
          <span class="name">{user.name}</span>
          {#if deleting}
            <span class="tick remove" aria-hidden="true"><X size="100%" strokeWidth={4} /></span>
          {:else if selected}
            <span class="tick" aria-hidden="true"><Check size="100%" strokeWidth={4} /></span>
          {/if}
        </button>
      </li>
    {/each}
    <li>
      <button class="tile add" onclick={() => (app.editor = 'new')} aria-label={t('newPlayer')} title={t('newPlayer')}>
        <span class="plus"><Plus size="60%" strokeWidth={3} /></span>
        <span class="name" aria-hidden="true">&nbsp;</span>
      </button>
    </li>
  </ul>

  <div class="footer">
    <button
      class="icon-btn"
      class:error={importError}
      onclick={() => fileInput.click()}
      aria-label={t('loadPlayer')}
      title={importError ?? t('loadPlayer')}
    >
      {#if importError}<X size={26} />{:else}<Upload size={24} />{/if}
    </button>
    <input
      bind:this={fileInput}
      type="file"
      accept=".json,application/json"
      class="visually-hidden"
      tabindex="-1"
      onchange={onFile}
    />
    {#if importError}
      <span class="error-text" role="alert">{importError}</span>
    {/if}
    <button
      class="bin"
      class:active={deleting}
      onclick={() => (deleting = !deleting)}
      aria-pressed={deleting}
      aria-label={t('deletePlayers')}
      title={t('deletePlayers')}
    >
      <Trash2 size="100%" />
    </button>
    {#if app.users.length > 0}
      <!-- Grown-ups: a backup of every player in one file (load it with ⬆️). -->
      <button class="bin" onclick={() => app.exportAll()} aria-label={t('saveAllPlayers')} title={t('saveAllPlayers')}>
        <FolderDown size="100%" />
      </button>
    {/if}
    <LanguageButton />
    {#if multi}
      <button
        class="icon-btn primary play"
        disabled={selectedCount < 2}
        onclick={() => app.startMultiplayer()}
        aria-label={t('play')}
        title={t('play')}
      >
        <Play size={30} fill="currentColor" />
      </button>
    {/if}
  </div>
</Modal>

{#if toDelete}
  {@const player = toDelete}
  <DeleteConfirm
    label={t('deletePlayer', { name: player.name })}
    hint={t('grownUpsOnly')}
    name={player.name}
    onconfirm={confirmDelete}
    oncancel={() => (toDelete = null)}
  >
    <span class="del-avatar"><Avatar avatar={player.avatar} /></span>
  </DeleteConfirm>
{/if}

<style>
  .mode {
    display: flex;
    justify-content: center;
    gap: 4px;
    width: max-content;
    margin: 0 auto clamp(8px, 2vmin, 16px);
    padding: 4px;
    border-radius: 999px;
    background: var(--surface);
  }
  .mode button {
    display: grid;
    place-items: center;
    width: clamp(44px, 9vmin, 56px);
    height: clamp(36px, 7vmin, 44px);
    border-radius: 999px;
    color: var(--muted);
    transition: background 0.12s ease;
  }
  .mode button.active {
    background: var(--green);
    color: #fff;
  }
  .users {
    list-style: none;
    margin: 0;
    padding: 4px;
    display: grid;
    grid-template-columns: repeat(auto-fit, clamp(96px, 18vmin, 150px));
    justify-content: center;
    gap: clamp(8px, 2vmin, 16px);
    width: min(640px, 86vw);
  }
  .tile {
    position: relative;
    width: 100%;
    display: grid;
    gap: 6px;
    justify-items: center;
    padding: 10px;
    border-radius: var(--radius);
    background: var(--surface);
    border: 3px solid transparent;
    transition:
      transform 0.12s ease,
      opacity 0.12s ease;
  }
  .tile:hover {
    transform: translateY(-2px);
  }
  .tile.selected {
    border-color: var(--green);
  }
  .tile.dimmed {
    opacity: 0.55;
  }
  .tile.new {
    outline: 3px solid var(--gold);
    animation: pop 0.35s ease;
  }
  .tick {
    position: absolute;
    top: -8px;
    inset-inline-end: -8px;
    width: 24px;
    height: 24px;
    padding: 3px;
    border-radius: 50%;
    background: var(--green);
    color: #fff;
  }
  .tile :global(.tile-flag),
  .plus {
    width: 100%;
  }
  .plus {
    display: grid;
    place-items: center;
    aspect-ratio: 1;
    border-radius: 4px;
    border: 3px dashed var(--muted);
    color: var(--green);
  }
  .name {
    max-width: 100%;
    font-weight: 600;
    font-size: clamp(13px, 2.4vmin, 16px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .footer {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: clamp(8px, 2vmin, 16px);
  }
  .play {
    margin-inline-start: auto;
  }
  .del-avatar {
    display: block;
    width: clamp(36px, 9vmin, 52px);
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
  .tile.deleting {
    animation: wiggle 0.6s ease-in-out infinite;
  }
  .tick.remove {
    background: var(--bad);
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
  .icon-btn.error {
    background: var(--bad);
    color: #fff;
    animation: shake 0.35s ease;
  }
  .error-text {
    color: var(--bad);
    font-weight: 600;
    font-size: 14px;
  }
  @keyframes pop {
    0% {
      transform: scale(0.9);
    }
    60% {
      transform: scale(1.05);
    }
  }
  @keyframes shake {
    20%,
    60% {
      transform: translateX(-4px);
    }
    40%,
    80% {
      transform: translateX(4px);
    }
  }
</style>
