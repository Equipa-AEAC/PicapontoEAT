<script setup lang="ts">
import type { Component } from "vue";

withDefaults(
  defineProps<{
    label: string;
    value: string;
    caption?: string;
    /** Phosphor icon component rendered in the card corner. */
    icon?: Component | null;
    /**
     * Turn the card into a control. A count is only worth showing if the reader
     * can get to the rows behind it; set this and handle `@action` to take them
     * there. Cards left non-interactive render exactly as before.
     */
    interactive?: boolean;
    /** Describes where `@action` goes, for screen readers. */
    actionHint?: string;
  }>(),
  {
    caption: undefined,
    icon: null,
    interactive: false,
    actionHint: undefined,
  },
);

defineEmits<{ action: [] }>();
</script>

<template>
  <component
    :is="interactive ? 'button' : 'article'"
    class="base-stats-card"
    :class="{ 'base-stats-card--interactive': interactive }"
    :type="interactive ? 'button' : undefined"
    :aria-label="interactive ? actionHint : undefined"
    @click="interactive && $emit('action')"
  >
    <div class="base-stats-card__top">
      <p class="base-stats-card__label">{{ label }}</p>
      <span v-if="icon" class="base-stats-card__icon" aria-hidden="true">
        <component :is="icon" weight="bold" />
      </span>
    </div>
    <p class="base-stats-card__value">{{ value }}</p>
    <p v-if="caption" class="base-stats-card__caption">{{ caption }}</p>
  </component>
</template>

<style scoped>
.base-stats-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-lg);
  border: var(--border-width) solid var(--border);
  background: var(--surface);
  text-align: left;
  width: 100%;
}

.base-stats-card--interactive {
  cursor: pointer;
}

.base-stats-card--interactive:hover {
  border-color: var(--primary);
  background: var(--hover);
}

.base-stats-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.base-stats-card__label {
  margin: 0;
  color: var(--foreground-secondary);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
}

.base-stats-card__icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: var(--radius-sm);
  color: var(--primary-contrast);
  background: var(--primary-subtle);
}

.base-stats-card__icon svg {
  width: 15px;
  height: 15px;
}

.base-stats-card__value {
  margin: 0;
  color: var(--foreground);
  font-size: var(--text-3xl);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
  font-variant-numeric: tabular-nums;
}

.base-stats-card__caption {
  margin: 0;
  color: var(--foreground-muted);
  font-size: var(--text-xs);
}
</style>
