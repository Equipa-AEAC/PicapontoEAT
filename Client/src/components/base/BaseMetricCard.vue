<script setup lang="ts">
import { computed } from "vue";

import type { TrendTone } from "../../types/dashboard";

const props = withDefaults(
  defineProps<{
    label: string;
    value: string;
    caption: string;
    trendLabel: string;
    trendTone?: TrendTone;
  }>(),
  {
    trendTone: "neutral",
  },
);

const toneClass = computed(() => `base-metric-card--${props.trendTone}`);
</script>

<template>
  <article class="base-metric-card" :class="toneClass">
    <div class="base-metric-card__top">
      <div class="base-metric-card__icon" aria-hidden="true">
        <slot name="icon" />
      </div>
      <span class="base-metric-card__trend">{{ trendLabel }}</span>
    </div>

    <p class="base-metric-card__label">{{ label }}</p>
    <p class="base-metric-card__value">{{ value }}</p>
    <p class="base-metric-card__caption">{{ caption }}</p>
  </article>
</template>