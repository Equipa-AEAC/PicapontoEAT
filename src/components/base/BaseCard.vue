<script setup lang="ts">
/**
 * A bordered panel on a surface.
 *
 * `padding` exists so a dense strip — a filter row, a one-line status bar — can
 * be compact *through the design system* rather than through a page-local CSS
 * override on `.base-card`. Before it, every page that wanted a tighter card
 * invented its own rule, which is how a product ends up with six card paddings
 * and no way to change any of them.
 *
 * - `normal` — the default. Content you read.
 * - `tight` — controls and one-line summaries. Still a card, less air.
 * - `none` — the card is a frame around something that owns its own padding
 *   (a table, a board), and a second inset would just push it around.
 */
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    padding?: "normal" | "tight" | "none";
  }>(),
  { title: undefined, description: undefined, padding: "normal" },
);
</script>

<template>
  <article class="base-card" :class="`base-card--padding-${padding}`">
    <header v-if="title || description || $slots.header" class="base-card__header">
      <div v-if="title || description">
        <h3 v-if="title" class="base-card__title">{{ title }}</h3>
        <p v-if="description" class="base-card__description">{{ description }}</p>
      </div>

      <slot name="header" />
    </header>

    <div class="base-card__body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="base-card__footer">
      <slot name="footer" />
    </footer>
  </article>
</template>
