<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  actionLabel?: string;
}>();

const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <div class="base-empty-state">
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <button v-if="actionLabel" type="button" class="base-empty-state__action" @click="emit('action')">{{ actionLabel }}</button>
  </div>
</template>

<style scoped>
.base-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-5);
  text-align: center;
}

.base-empty-state h3 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  color: var(--foreground);
}

.base-empty-state p {
  margin: 0;
  max-width: 52ch;
  color: var(--foreground-secondary);
  font-size: var(--text-sm);
}

.base-empty-state__action {
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  border: var(--border-width) solid var(--border-strong);
  background: var(--surface);
  color: var(--foreground);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.base-empty-state__action:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-subtle);
}
</style>
