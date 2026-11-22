<script lang="ts">
  /** A silver coin with a circular arrow: rounds played in this game (replaces Flag Quiz's silver star). */
  let { class: className = '' }: { class?: string } = $props();
</script>

<svg class="round-icon {className}" viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="12" cy="12" r="10.5" class="coin" />
  <path d="M16.6 9.2A5.3 5.3 0 1 0 17.3 12.5" class="arrow" />
  <path d="M17.6 5.6v3.9h-3.9" class="arrow" />
</svg>

<style>
  .round-icon {
    width: 1em;
    height: 1em;
  }
  .coin {
    fill: var(--silver);
    stroke: var(--silver-edge);
    stroke-width: 1.5;
  }
  .arrow {
    fill: none;
    stroke: #5b636d;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
