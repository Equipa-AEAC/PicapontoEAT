<script setup lang="ts">
import Timeline from "primevue/timeline";

defineProps<{
  value: Array<{ title: string; description: string; time: string; tone?: string }>;
}>();
</script>

<template>
  <Timeline :value="value" class="base-timeline">
    <template #marker="slotProps">
      <span class="base-timeline__marker" :class="`base-timeline__marker--${slotProps.item.tone ?? 'info'}`" />
    </template>

    <template #content="slotProps">
      <div class="base-timeline__content">
        <div class="base-timeline__header">
          <strong>{{ slotProps.item.title }}</strong>
          <span>{{ slotProps.item.time }}</span>
        </div>
        <p>{{ slotProps.item.description }}</p>
      </div>
    </template>
  </Timeline>
</template>
