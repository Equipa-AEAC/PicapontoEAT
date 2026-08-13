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
  gap: 8px;
  padding: 36px 20px;
  text-align: center;
}

.base-empty-state h3 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 600;
  color: var(--text-primary);
}

.base-empty-state p {
  margin: 0;
  max-width: 52ch;
  color: var(--text-secondary);
  font-size: 0.87rem;
}

.base-empty-state__action {
  margin-top: 6px;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(122, 167, 255, 0.32);
  background: transparent;
  color: var(--text-primary);
  font-size: 0.85rem;
  font-weight: 600;
}

.base-empty-state__action:hover {
  border-color: rgba(122, 167, 255, 0.48);
  background: rgba(122, 167, 255, 0.1);
}
</style>
