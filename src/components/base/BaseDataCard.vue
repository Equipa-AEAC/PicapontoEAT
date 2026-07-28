<script setup lang="ts">
defineProps<{
  title: string;
  value: string;
  description?: string;
  trendLabel?: string;
}>();
</script>

<template>
  <article class="base-data-card">
    <div class="base-data-card__header">
      <div>
        <p class="base-data-card__title">{{ title }}</p>
        <p v-if="description" class="base-data-card__description">{{ description }}</p>
      </div>
      <span v-if="trendLabel" class="base-data-card__trend">{{ trendLabel }}</span>
    </div>

    <p class="base-data-card__value">{{ value }}</p>
    <slot />
  </article>
</template>
