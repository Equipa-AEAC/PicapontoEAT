<script setup lang="ts">
import type { Component } from "vue";

withDefaults(
  defineProps<{
    label: string;
    value: string;
    caption?: string;
    /** Phosphor icon component rendered in the card corner. */
    icon?: Component | null;
  }>(),
  {
    caption: undefined,
    icon: null,
  },
);
</script>

<template>
  <article class="base-stats-card">
    <div class="base-stats-card__top">
      <p class="base-stats-card__label">{{ label }}</p>
      <span v-if="icon" class="base-stats-card__icon" aria-hidden="true">
        <component :is="icon" weight="bold" />
      </span>
    </div>
    <p class="base-stats-card__value">{{ value }}</p>
    <p v-if="caption" class="base-stats-card__caption">{{ caption }}</p>
  </article>
</template>

<style scoped>
.base-stats-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--surface-border);
  background: linear-gradient(180deg, rgba(17, 26, 42, 0.92), rgba(12, 20, 34, 0.92));
  box-shadow: var(--shadow-lg);
}

.base-stats-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.base-stats-card__label {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.base-stats-card__icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: 10px;
  color: var(--primary);
  background: rgba(122, 167, 255, 0.12);
}

.base-stats-card__icon svg {
  width: 17px;
  height: 17px;
}

.base-stats-card__value {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.9rem;
  font-weight: 600;
  line-height: 1.1;
}

.base-stats-card__caption {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.8rem;
}
</style>
