<script setup lang="ts">
defineProps<{
  value: Array<{ title: string; description: string; time: string; tone?: string }>;
}>();
</script>

<template>
  <ol class="base-timeline">
    <li v-for="(item, index) in value" :key="index" class="base-timeline__item">
      <span class="base-timeline__marker" :class="`base-timeline__marker--${item.tone ?? 'info'}`" />
      <div class="base-timeline__content">
        <div class="base-timeline__header">
          <strong>{{ item.title }}</strong>
          <span>{{ item.time }}</span>
        </div>
        <p>{{ item.description }}</p>
      </div>
    </li>
  </ol>
</template>

<style>
.base-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.base-timeline__item {
  display: flex;
  gap: 14px;
  padding-bottom: 20px;
  position: relative;
}

.base-timeline__item:not(:last-child)::before {
  content: "";
  position: absolute;
  left: 5px;
  top: 16px;
  bottom: 0;
  width: 1px;
  background: var(--surface-border);
}

.base-timeline__marker {
  flex: 0 0 auto;
  width: 11px;
  height: 11px;
  margin-top: 4px;
  border-radius: 50%;
  background: var(--info);
}

.base-timeline__marker--success {
  background: var(--success);
}

.base-timeline__marker--warning {
  background: var(--warning);
}

.base-timeline__marker--danger {
  background: var(--danger);
}

.base-timeline__content {
  flex: 1;
  min-width: 0;
}

.base-timeline__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.base-timeline__header strong {
  color: var(--text-primary);
}

.base-timeline__content p {
  margin: 0;
  color: var(--text-secondary);
}
</style>
