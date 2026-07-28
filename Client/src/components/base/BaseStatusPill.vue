<script setup lang="ts">
import { computed } from "vue";

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
</script>

<template>
  <span :class="classes">{{ label }}</span>
</template>