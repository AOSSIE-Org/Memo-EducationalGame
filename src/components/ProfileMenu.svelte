<script lang="ts">
  import {
    Bell,
    BellOff,
    ChartColumn,
    Check,
    Coffee,
    Download,
    FileDown,
    GalleryHorizontalEnd,
    Info,
    Languages,
    Moon,
    Pencil,
    Share2,
    Speech,
    Sun,
    Users,
    Volume2,
    VolumeX,
    X,
  } from '@lucide/svelte';
  import { app, shareApp } from '../lib/app.svelte';
  import { install } from '../lib/install.svelte';
  import { remindersSupported } from '../lib/reminders';
  import { LANGUAGES, t } from '../lib/i18n.svelte';
  import { upcoming } from '../lib/turns';
  import Avatar from './Avatar.svelte';

  let root = $state<HTMLDivElement>();
  let shareResult = $state<'copied' | 'failed' | null>(null);
  let shareTimer: ReturnType<typeof setTimeout> | undefined;

  function closeOnOutside(e: PointerEvent) {
    if (app.menuOpen && !root?.contains(e.target as Node)) app.menuOpen = false;
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && app.menuOpen) app.menuOpen = false;
  }

  function open(fn: () => void) {
    app.menuOpen = false;
    fn();
  }

  async function share() {
    const result = await shareApp();
    clearTimeout(shareTimer);
    shareResult = result === 'shared' ? null : result;
    shareTimer = setTimeout(() => (shareResult = null), 1500);
  }
</script>

<svelte:window onpointerdown={closeOnOutside} {onkeydown} />

{#if app.user}
  {@const user = app.user}
  <div class="profile" bind:this={root}>
    <button
      class="me"
      aria-label={t('playerMenu', { name: user.name })}
      aria-haspopup="menu"
      aria-expanded={app.menuOpen}
      title={user.name}
      onclick={() => (app.menuOpen = !app.menuOpen)}
    >
      <span class="me-name">{user.name}</span>
      <!-- Pairs that are found fly here (data-pair-target). -->
      <span class="me-flag" data-pair-target><Avatar avatar={user.avatar} /></span>
    </button>

    {#if app.multiplayer && !app.menuOpen}
      <!-- Who plays next, in order. -->
      <ol class="queue" aria-label={t('nextPlayers')}>
        {#each upcoming(app.players, app.turn) as next (next.id)}
          <li title={next.name} aria-label={next.name}><Avatar avatar={next.avatar} /></li>
        {/each}
      </ol>
    {/if}

    {#if app.menuOpen}
      <div class="menu" role="menu" aria-label={t('menu')}>
        <button
          role="menuitem"
          class="item"
          onclick={() => app.toggleTheme()}
          aria-label={user.theme === 'dark' ? t('lightMode') : t('darkMode')}
          title={user.theme === 'dark' ? t('lightMode') : t('darkMode')}
        >
          {#if user.theme === 'dark'}<Sun />{:else}<Moon />{/if}
        </button>
        <button role="menuitem" class="item" onclick={() => open(() => (app.editor = 'edit'))} aria-label={t('editPlayer')} title={t('editPlayer')}>
          <Pencil />
        </button>
        <button role="menuitem" class="item" onclick={() => open(() => (app.statsOpen = true))} aria-label={t('statistics')} title={t('statistics')}>
          <ChartColumn />
        </button>
        <button
          role="menuitemcheckbox"
          aria-checked={app.settings.speech}
          class="item"
          class:off={!app.settings.speech}
          onclick={() => app.setSettings({ speech: !app.settings.speech })}
          aria-label={t('readAloud')}
          title={app.settings.speech ? t('readAloudOn') : t('readAloudOff')}
        >
          <Speech />
        </button>
        <button
          role="menuitemcheckbox"
          aria-checked={app.settings.sounds}
          class="item"
          class:off={!app.settings.sounds}
          onclick={() => app.setSettings({ sounds: !app.settings.sounds })}
          aria-label={t('soundEffects')}
          title={app.settings.sounds ? t('soundEffectsOn') : t('soundEffectsOff')}
        >
          {#if app.settings.sounds}<Volume2 />{:else}<VolumeX />{/if}
        </button>
        {#if install.standalone && remindersSupported()}
          <!-- Daily reminder: only in the installed app, where browsers allow it. -->
          <button
            role="menuitemcheckbox"
            aria-checked={app.settings.reminders}
            class="item"
            class:off={!app.settings.reminders}
            class:bad={app.reminderBlocked}
            onclick={() => app.toggleReminders()}
            aria-label={t('reminders')}
            title={app.reminderBlocked ? t('remindersBlocked') : app.settings.reminders ? t('remindersOn') : t('remindersOff')}
          >
            {#if app.settings.reminders}<Bell />{:else}<BellOff />{/if}
          </button>
        {/if}
        <button
          role="menuitem"
          class="item"
          onclick={() => open(() => (app.languageOpen = true))}
          aria-label={t('language')}
          title="{t('language')}: {LANGUAGES.find((l) => l.code === app.settings.language)?.name}"
        >
          <Languages />
        </button>
        <button
          role="menuitem"
          class="item"
          class:ok={shareResult === 'copied'}
          class:bad={shareResult === 'failed'}
          onclick={share}
          aria-label={shareResult === 'copied' ? t('linkCopied') : t('share')}
          title={shareResult === 'copied' ? t('linkCopied') : t('share')}
        >
          {#if shareResult === 'copied'}<Check />{:else if shareResult === 'failed'}<X />{:else}<Share2 />{/if}
        </button>
        <button role="menuitem" class="item" onclick={() => app.exportUser()} aria-label={t('saveMyData')} title={t('saveMyData')}>
          <FileDown />
        </button>
        {#if install.available}
          <button role="menuitem" class="item" onclick={() => open(() => install.install())} aria-label={t('installApp')} title={t('installApp')}>
            <Download />
          </button>
        {/if}
        <a role="menuitem" class="item" href={app.settings.language === 'en' ? './credits.html' : `./credits.html#${app.settings.language}`} target="_blank" rel="noopener" aria-label={t('credits')} title={t('credits')}>
          <Info />
        </a>
        <a
          role="menuitem"
          class="item donate"
          href="https://buymeacoffee.com/aossie"
          target="_blank"
          rel="noopener"
          aria-label={t('donate')}
          title={t('donate')}
        >
          <Coffee />
        </a>
        <button role="menuitem" class="item" onclick={() => app.changeGame()} aria-label={t('changeCards')} title={t('changeCards')}>
          <GalleryHorizontalEnd />
        </button>
        <button role="menuitem" class="item" onclick={() => app.switchUser()} aria-label={t('switchPlayer')} title={t('switchPlayer')}>
          <Users />
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .profile {
    position: relative;
  }
  .me {
    display: flex;
    align-items: center;
    gap: clamp(6px, 1.5vmin, 12px);
    border-radius: 8px;
    transition: transform 0.12s ease;
  }
  .me:hover {
    transform: scale(1.04);
  }
  .me-name {
    max-width: clamp(70px, 14vw, 200px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 800;
    font-size: clamp(16px, 3.6vmin, 26px);
  }
  .me-flag {
    display: block;
    height: clamp(36px, 9vmin, 58px);
    aspect-ratio: 1;
    flex-shrink: 0;
  }
  .me-flag :global(svg) {
    width: 100%;
    height: 100%;
  }
  .queue {
    position: absolute;
    top: calc(100% + 6px);
    inset-inline-end: 0;
    display: flex;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
    pointer-events: none;
  }
  .queue li {
    height: clamp(16px, 4vmin, 24px);
    aspect-ratio: 1;
    opacity: 0.85;
  }
  .queue :global(svg) {
    width: 100%;
    height: 100%;
  }
  .menu {
    position: absolute;
    top: calc(100% + 8px);
    inset-inline-end: 0;
    z-index: 15;
    display: grid;
    grid-template-columns: repeat(2, auto);
    gap: clamp(4px, 1vmin, 8px);
    padding: clamp(6px, 1.4vmin, 10px);
    border-radius: var(--radius);
    background: var(--bg);
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
    animation: drop 0.15s ease;
  }
  .item {
    display: grid;
    place-items: center;
    width: clamp(40px, 8.5vmin, 52px);
    height: clamp(40px, 8.5vmin, 52px);
    border-radius: var(--radius-sm);
    background: var(--surface);
    transition: background 0.12s ease;
  }
  .item:hover {
    background: var(--surface-2);
  }
  a.item {
    color: inherit;
  }
  a.item.donate {
    background: var(--gold);
    color: var(--ink);
  }
  /* A switched-off setting: dimmed and crossed out. */
  .item.off {
    position: relative;
    color: var(--muted);
  }
  .item.off::after {
    content: '';
    position: absolute;
    width: 60%;
    height: 2.5px;
    border-radius: 2px;
    background: var(--bad);
    transform: rotate(-45deg);
  }
  .item.ok {
    background: var(--ok);
    color: #fff;
  }
  .item.bad {
    background: var(--bad);
    color: #fff;
  }
  /* Short screens (phones in landscape): lay the items out in rows. */
  @media (max-height: 560px) {
    .menu {
      grid-template-columns: repeat(5, auto);
    }
  }
  @keyframes drop {
    from {
      transform: translateY(-6px);
      opacity: 0;
    }
  }
</style>
