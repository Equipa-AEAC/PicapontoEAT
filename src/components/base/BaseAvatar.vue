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
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(79, 140, 255, 0.9), rgba(68, 211, 157, 0.65));
  color: #04101f;
  font-weight: 700;
  font-size: 0.82rem;
}

.base-avatar--large {
  width: 56px;
  height: 56px;
  font-size: 1rem;
}

.base-avatar--xlarge {
  width: 88px;
  height: 88px;
  font-size: 1.4rem;
}

.base-avatar__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
