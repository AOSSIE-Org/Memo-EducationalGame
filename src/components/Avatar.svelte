<script lang="ts">
  import { shapeMarkup, type ShapeId } from '../lib/shapes';
  import type { Avatar } from '../lib/types';

  interface Props {
    avatar: Avatar;
    /** Shape override, used to preview shapes in the same colour. */
    shape?: ShapeId;
    class?: string;
  }

  /** A player's avatar: their shape in their colour (drawn like the cards of the shapes set). */
  let { avatar, shape, class: className = '' }: Props = $props();
  // The colour is validated (#RRGGBB) wherever avatars are created or loaded.
  let markup = $derived(shapeMarkup(shape ?? avatar.shape, avatar.color));
</script>

<svg class="avatar {className}" viewBox="-4 -4 108 108" aria-hidden="true">{@html markup}</svg>

<style>
  .avatar {
    display: block;
    aspect-ratio: 1;
  }
</style>
