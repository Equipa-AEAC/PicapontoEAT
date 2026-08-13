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

<style scoped>
.base-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.base-section__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.base-section__header h2 {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 600;
  color: var(--text-primary);
}

.base-section__header p {
  margin: 0;
  max-width: 78ch;
  color: var(--text-secondary);
  font-size: 0.85rem;
}
</style>
