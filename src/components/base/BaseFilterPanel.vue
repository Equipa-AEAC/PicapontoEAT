<script setup lang="ts">
import BaseCard from "./BaseCard.vue";

defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<template>
  <BaseCard :title="title" :description="description">
    <div class="base-filter-panel">
      <slot />
    </div>
  </BaseCard>
</template>

<style scoped>
.base-filter-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
</style>
