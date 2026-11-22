<script lang="ts">
  /** Two cards, fanned: pairs found (replaces Flag Quiz's gold check mark). */
  let { class: className = '' }: { class?: string } = $props();
</script>

<svg class="pair-icon {className}" viewBox="0 0 24 24" aria-hidden="true">
  <rect x="3" y="5.5" width="10.5" height="15" rx="2" transform="rotate(-14 8.25 13)" />
  <rect x="10.5" y="3.5" width="10.5" height="15" rx="2" transform="rotate(12 15.75 11)" />
  <path d="M15.75 8.4l.9 1.9 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z" class="mark" />
</svg>

<style>
  .pair-icon {
    width: 1em;
    height: 1em;
    fill: var(--gold);
    stroke: var(--gold-edge);
    stroke-width: 1.6;
    stroke-linejoin: round;
  }
  .mark {
    fill: var(--gold-edge);
    stroke: none;
  }
</style>
