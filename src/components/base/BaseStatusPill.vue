<script setup lang="ts">
import { computed } from "vue";

import { toDisplayLabel } from "../../utils/label";

const props = withDefaults(
  defineProps<{
    tone?: "success" | "warning" | "danger" | "info";
    label: string;
  }>(),
  {
    tone: "info",
  },
);

const classes = computed(() => ["status-pill", `status-pill--${props.tone}`]);
const displayLabel = computed(() => toDisplayLabel(props.label));
</script>

<template>
  <span :class="classes">{{ displayLabel }}</span>
</template>