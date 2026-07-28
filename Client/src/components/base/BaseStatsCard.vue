<script setup lang="ts">
defineProps<{
  label: string;
  value: string;
  caption?: string;
}>();
</script>

<template>
  <article class="base-stats-card">
    <p class="base-stats-card__label">{{ label }}</p>
    <p class="base-stats-card__value">{{ value }}</p>
    <p v-if="caption" class="base-stats-card__caption">{{ caption }}</p>
  </article>
</template>
