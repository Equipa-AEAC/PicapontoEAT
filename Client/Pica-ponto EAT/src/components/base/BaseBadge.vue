<script setup lang="ts">
defineProps<{
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}>();
</script>

<template>
  <span class="base-badge" :class="`base-badge--${tone ?? 'neutral'}`">{{ label }}</span>
</template>
