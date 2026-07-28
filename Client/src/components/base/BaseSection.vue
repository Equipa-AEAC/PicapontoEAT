<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<template>
  <section class="base-section">
    <header v-if="title || description" class="base-section__header">
      <h2 v-if="title">{{ title }}</h2>
      <p v-if="description">{{ description }}</p>
    </header>
    <slot />
  </section>
</template>