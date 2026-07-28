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
