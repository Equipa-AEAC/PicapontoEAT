<script setup lang="ts">
defineProps<{
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}>();
</script>

<template>
  <span class="base-badge" :class="`base-badge--${tone ?? 'neutral'}`">{{ label }}</span>
</template>

<style scoped>
.base-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 600;
  white-space: nowrap;
  text-transform: capitalize;
}

.base-badge--neutral {
  background: rgba(71, 85, 105, 0.24);
  color: var(--text-secondary);
}

.base-badge--success {
  background: rgba(68, 211, 157, 0.14);
  color: #abf3d3;
}

.base-badge--warning {
  background: rgba(240, 179, 90, 0.14);
  color: #fde68a;
}

.base-badge--danger {
  background: rgba(244, 111, 111, 0.14);
  color: #fecaca;
}

.base-badge--info {
  background: rgba(99, 179, 255, 0.14);
  color: #bfdbfe;
}
</style>
