<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  actionLabel?: string;
}>();

const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <div class="base-empty-state">
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <button v-if="actionLabel" type="button" class="base-empty-state__action" @click="emit('action')">{{ actionLabel }}</button>
  </div>
</template>
