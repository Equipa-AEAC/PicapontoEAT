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
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-lg);
  border: var(--border-width) solid var(--border);
  background: var(--surface);
}

.base-data-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.base-data-card__title {
  margin: 0;
  color: var(--foreground-secondary);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
}

.base-data-card__description {
  margin: var(--space-1) 0 0;
  color: var(--foreground-muted);
  font-size: var(--text-xs);
}

.base-data-card__trend {
  flex: 0 0 auto;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--secondary-subtle);
  color: var(--foreground-secondary);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  font-variant-numeric: tabular-nums;
}

.base-data-card__value {
  margin: 0;
  color: var(--foreground);
  font-size: var(--text-3xl);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
  font-variant-numeric: tabular-nums;
}
</style>
