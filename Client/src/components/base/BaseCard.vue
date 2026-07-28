<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<template>
  <article class="base-card">
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