<script setup lang="ts">
withDefaults(
  defineProps<{
    image?: string | null;
    label: string;
    size?: "normal" | "large" | "xlarge";
  }>(),
  {
    image: undefined,
    size: "normal",
  },
);
</script>

<template>
  <span class="base-avatar" :class="`base-avatar--${size}`">
    <img v-if="image" :src="image" :alt="label" class="base-avatar__image" />
    <span v-else class="base-avatar__initials">{{ label.slice(0, 2).toUpperCase() }}</span>
  </span>
</template>

<style>
.base-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--primary-subtle);
  color: var(--primary-contrast);
  font-weight: var(--weight-semibold);
  font-size: var(--text-xs);
}

.base-avatar--large {
  width: 56px;
  height: 56px;
  font-size: var(--text-md);
}

.base-avatar--xlarge {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-lg);
  font-size: var(--text-xl);
}

.base-avatar__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
