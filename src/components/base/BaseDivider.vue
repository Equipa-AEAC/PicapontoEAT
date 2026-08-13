<script setup lang="ts">
withDefaults(
  defineProps<{
    align?: "left" | "center" | "right";
  }>(),
  {
    align: "left",
  },
);
</script>

<template>
  <div class="base-divider" :class="`base-divider--${align}`">
    <span v-if="$slots.default" class="base-divider__label"><slot /></span>
  </div>
</template>

<style scoped>
.base-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.base-divider::before,
.base-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--surface-border);
}

.base-divider--left::before {
  flex: 0 0 0;
}

.base-divider--right::after {
  flex: 0 0 0;
}
</style>
