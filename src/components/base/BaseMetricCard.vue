<script setup lang="ts">
import { computed, type Component } from "vue";

import type { TrendTone } from "../../types/dashboard";

const props = withDefaults(
  defineProps<{
    label: string;
    value: string;
    caption: string;
    /** Optional: render a badge only when there is a real, computed signal to show. */
    trendLabel?: string;
    trendTone?: TrendTone;
    /** Phosphor icon component. The `icon` slot still wins when both are given. */
    icon?: Component | null;
  }>(),
  {
    trendLabel: undefined,
    trendTone: "neutral",
    icon: null,
  },
);

const toneClass = computed(() => `base-metric-card--${props.trendTone}`);
</script>

<template>
  <article class="base-metric-card" :class="toneClass">
    <div class="base-metric-card__top">
      <div class="base-metric-card__icon" aria-hidden="true">
        <slot name="icon">
          <component :is="icon" v-if="icon" weight="bold" />
        </slot>
      </div>
      <span v-if="trendLabel" class="base-metric-card__trend">{{ trendLabel }}</span>
    </div>

    <p class="base-metric-card__label">{{ label }}</p>
    <p class="base-metric-card__value">{{ value }}</p>
    <p class="base-metric-card__caption">{{ caption }}</p>
  </article>
</template>
