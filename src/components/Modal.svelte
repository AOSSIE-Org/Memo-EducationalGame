<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    /** When given, Escape and clicking the backdrop close the modal. */
    onclose?: () => void;
    wide?: boolean;
    /** Smaller margins and padding, for dialogs that need every pixel (e.g. the language picker). */
    tight?: boolean;
    children: Snippet;
  }

  let { label, onclose, wide = false, tight = false, children }: Props = $props();
  let panel: HTMLDivElement;

  $effect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.focus();
    return () => previous?.focus?.();
  });

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && onclose) {
      e.stopPropagation();
      onclose();
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="scrim" class:tight onclick={(e) => e.target === e.currentTarget && onclose?.()} {onkeydown}>
  <div
    class="panel"
    class:wide
    role="dialog"
    aria-modal="true"
    aria-label={label}
    tabindex="-1"
    bind:this={panel}
  >
    {@render children()}
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: grid;
    place-items: center;
    padding: var(--gutter);
    background: var(--scrim);
    animation: fade 0.15s ease;
  }
  .panel {
    position: relative;
    max-width: min(720px, 100%);
    max-height: 100%;
    overflow: auto;
    padding: clamp(12px, 3vmin, 28px);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--text);
    box-shadow: var(--shadow);
    outline: none;
    animation: pop 0.18s ease;
  }
  .tight {
    padding: 6px;
  }
  .tight .panel {
    padding: clamp(6px, 1.6vmin, 20px);
  }
  .panel.wide {
    max-width: min(960px, 100%);
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @keyframes pop {
    from {
      transform: scale(0.94);
      opacity: 0;
    }
  }
</style>
