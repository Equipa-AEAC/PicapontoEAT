<script setup lang="ts">
import Avatar from "primevue/avatar";

defineProps<{
  image?: string | null;
  label: string;
  size?: "normal" | "large" | "xlarge";
}>();
</script>

<template>
  <Avatar :image="image ?? undefined" :label="label.slice(0, 2).toUpperCase()" :size="size ?? 'normal'" shape="circle" class="base-avatar" />
</template>
