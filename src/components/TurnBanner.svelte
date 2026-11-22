<script lang="ts">
  import type { User } from '../lib/types';
  import Avatar from './Avatar.svelte';

  /** Multiplayer: announces whose turn it is. */
  let { player }: { player: User } = $props();
</script>

<div class="banner" role="status" aria-live="assertive">
  <div class="card">
    <Avatar avatar={player.avatar} class="banner-flag" />
    <span class="name">{player.name}</span>
  </div>
</div>

<style>
  .banner {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: grid;
    place-items: center;
    background: var(--scrim);
    animation: fade 0.2s ease;
  }
  .card {
    display: grid;
    justify-items: center;
    gap: clamp(8px, 2.5vmin, 20px);
    padding: clamp(16px, 4vmin, 36px) clamp(24px, 6vmin, 56px);
    border-radius: var(--radius);
    background: var(--bg);
    box-shadow: var(--shadow);
    animation: pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .card :global(.banner-flag) {
    height: clamp(90px, 30dvh, 220px);
    width: auto;
  }
  .name {
    max-width: 70vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: clamp(28px, 8vmin, 60px);
    font-weight: 900;
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
