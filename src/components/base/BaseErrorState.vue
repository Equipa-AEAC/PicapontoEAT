<script setup lang="ts">
import { computed, getCurrentInstance } from "vue";
import { PhWarningCircle } from "@phosphor-icons/vue";

import BaseButton from "./BaseButton.vue";

/**
 * What a page shows when a request failed.
 *
 * Distinct from `BaseEmptyState` on purpose: "there is nothing here" and "we
 * could not find out" are different facts, and showing the first when the second
 * is true is the single most misleading thing a data page can do.
 */
withDefaults(
  defineProps<{
    message: string;
    title?: string;
    retryLabel?: string;
    /** Omit the handler and no retry button is offered. */
    retrying?: boolean;
  }>(),
  {
    title: "Could not load this",
    retryLabel: "Try again",
    retrying: false,
  },
);

defineEmits<{ retry: [] }>();

/*
 * Offer the retry button only when the parent actually handles it — a retry that
 * does nothing is worse than no retry at all.
 *
 * This reads the raw vnode props rather than `$attrs`: `retry` is a *declared*
 * emit, so Vue strips `onRetry` out of `$attrs` before the template sees it, and
 * checking there always came back empty.
 */
const instance = getCurrentInstance();
const canRetry = computed(() => Boolean(instance?.vnode.props?.onRetry));
</script>

<template>
  <div class="base-error-state" role="alert">
    <PhWarningCircle weight="fill" class="base-error-state__icon" />

    <div class="base-error-state__copy">
      <p class="base-error-state__title">{{ title }}</p>
      <p class="base-error-state__message">{{ message }}</p>
    </div>

    <BaseButton
      v-if="canRetry"
      :label="retryLabel"
      severity="secondary"
      outlined
      size="small"
      :loading="retrying"
      @click="$emit('retry')"
    />
  </div>
</template>

<style scoped>
.base-error-state {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border: var(--border-width) solid var(--danger-border);
  border-radius: var(--radius-md);
  background: var(--danger-subtle);
}

.base-error-state__icon {
  flex: none;
  width: 20px;
  height: 20px;
  color: var(--danger-foreground);
}

.base-error-state__copy {
  flex: 1 1 auto;
  min-width: 0;
}

.base-error-state__title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--danger-foreground);
}

.base-error-state__message {
  margin: 2px 0 0;
  font-size: var(--text-sm);
  color: var(--foreground-secondary);
}

@media (max-width: 640px) {
  .base-error-state {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
