<script lang="ts">
  import { RotateCw, Smartphone } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { app } from './lib/app.svelte';
  import AvatarEditor from './components/AvatarEditor.svelte';
  import CardSetEditor from './components/CardSetEditor.svelte';
  import FullscreenButton from './components/FullscreenButton.svelte';
  import GameOver from './components/GameOver.svelte';
  import GamePicker from './components/GamePicker.svelte';
  import InstallHelp from './components/InstallHelp.svelte';
  import LanguageModal from './components/LanguageModal.svelte';
  import MemoBoard from './components/MemoBoard.svelte';
  import ProfileMenu from './components/ProfileMenu.svelte';
  import SetImportModal from './components/SetImportModal.svelte';
  import Splash from './components/Splash.svelte';
  import StatsModal from './components/StatsModal.svelte';
  import Streaks from './components/Streaks.svelte';
  import TurnBanner from './components/TurnBanner.svelte';
  import UpdateButton from './components/UpdateButton.svelte';
  import UserPicker from './components/UserPicker.svelte';
  import { install } from './lib/install.svelte';

  /** The splash screen stays for at least this long, and until the app is ready. */
  const SPLASH_MS = 4000;
  let splash = $state(true);

  onMount(() => {
    const started = Date.now();
    void app.init().then(() => {
      setTimeout(() => (splash = false), Math.max(0, SPLASH_MS - (Date.now() - started)));
    });
  });
</script>

<div class="app">
  <header>
    <Streaks />
    <ProfileMenu />
  </header>

  <main>
    {#if app.phase === 'playing' || (app.phase === 'pickGame' && app.game)}
      <MemoBoard />
    {/if}
  </main>

  {#if app.editor}
    <AvatarEditor mode={app.editor} />
  {:else if app.setEditor !== null}
    {#key app.setEditor}
      <CardSetEditor setId={app.setEditor} />
    {/key}
  {:else if app.setImportOpen}
    <SetImportModal />
  {:else if app.statsOpen}
    <StatsModal />
  {:else if app.phase === 'pickUser'}
    <UserPicker />
  {:else if app.phase === 'pickGame'}
    <GamePicker />
  {:else if app.game?.finished}
    <GameOver />
  {/if}

  {#if app.banner}
    <TurnBanner player={app.banner} />
  {/if}

  {#if app.languageOpen}
    <LanguageModal />
  {/if}
  {#if install.helpOpen}
    <InstallHelp />
  {/if}

  <FullscreenButton />
  <UpdateButton />

  {#if splash}
    <Splash onclose={() => (splash = false)} />
  {/if}

  <div class="rotate" aria-hidden="true">
    <span class="phone"><Smartphone size="100%" /></span>
    <RotateCw size={48} />
  </div>
</div>

<style>
  .app {
    --header-h: clamp(40px, 9vmin, 64px);
    position: relative;
    height: 100%;
    display: grid;
    padding: max(var(--gutter), env(safe-area-inset-top)) max(var(--gutter), env(safe-area-inset-right))
      max(var(--gutter), env(safe-area-inset-bottom)) max(var(--gutter), env(safe-area-inset-left));
  }
  header {
    position: absolute;
    inset: max(var(--gutter), env(safe-area-inset-top)) max(var(--gutter), env(safe-area-inset-right)) auto
      max(var(--gutter), env(safe-area-inset-left));
    z-index: 10;
    height: var(--header-h);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    pointer-events: none;
  }
  header > :global(*) {
    pointer-events: auto;
  }
  main {
    min-height: 0;
    min-width: 0;
    /* Room for the header (and the next players' avatars below it). */
    padding-top: calc(var(--header-h) + clamp(14px, 4vmin, 30px));
  }
  .rotate {
    display: none;
  }
  @media (orientation: portrait) and (max-width: 700px) {
    .rotate {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: grid;
      place-content: center;
      justify-items: center;
      gap: 24px;
      background: var(--bg);
      color: var(--green);
    }
    .phone {
      width: 96px;
      height: 96px;
      animation: turn 2s ease-in-out infinite;
    }
  }
  @keyframes turn {
    0%,
    30% {
      transform: rotate(0);
    }
    60%,
    100% {
      transform: rotate(-90deg);
    }
  }
</style>
