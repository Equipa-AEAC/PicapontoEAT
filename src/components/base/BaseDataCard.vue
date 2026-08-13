<script setup lang="ts">
defineProps<{
  title: string;
  value: string;
  description?: string;
  trendLabel?: string;
}>();
</script>

<template>
  <article class="base-data-card">
    <div class="base-data-card__header">
      <div>
        <p class="base-data-card__title">{{ title }}</p>
        <p v-if="description" class="base-data-card__description">{{ description }}</p>
      </div>
      <span v-if="trendLabel" class="base-data-card__trend">{{ trendLabel }}</span>
    </div>

    <p class="base-data-card__value">{{ value }}</p>
    <slot />
  </article>
</template>

<style scoped>
.base-data-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--surface-border);
  background: linear-gradient(180deg, rgba(17, 26, 42, 0.92), rgba(12, 20, 34, 0.92));
  box-shadow: var(--shadow-lg);
}

.base-data-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.base-data-card__title {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.base-data-card__description {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.base-data-card__trend {
  flex: 0 0 auto;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(71, 85, 105, 0.22);
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.base-data-card__value {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.9rem;
  font-weight: 600;
  line-height: 1.1;
}
</style>
