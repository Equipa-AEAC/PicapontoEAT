<script setup lang="ts">
import { computed } from "vue";

import { toDisplayLabel } from "../../utils/label";

const props = defineProps<{
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}>();

const displayLabel = computed(() => toDisplayLabel(props.label));
</script>

<template>
  <span class="base-badge" :class="`base-badge--${tone ?? 'neutral'}`">{{ displayLabel }}</span>
</template>

<style scoped>
.base-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  border: var(--border-width) solid transparent;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  line-height: 1.5;
  white-space: nowrap;
}

.base-badge--neutral {
  background: var(--secondary-subtle);
  border-color: var(--border);
  color: var(--foreground-secondary);
}

.base-badge--success {
  background: var(--success-subtle);
  border-color: var(--success-border);
  color: var(--success-foreground);
}

.base-badge--warning {
  background: var(--warning-subtle);
  border-color: var(--warning-border);
  color: var(--warning-foreground);
}

.base-badge--danger {
  background: var(--danger-subtle);
  border-color: var(--danger-border);
  color: var(--danger-foreground);
}

.base-badge--info {
  background: var(--info-subtle);
  border-color: var(--info-border);
  color: var(--info-foreground);
}
</style>
