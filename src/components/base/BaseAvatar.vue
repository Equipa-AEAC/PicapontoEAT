<script setup lang="ts">
/**
 * A person, as an image or as their initials.
 *
 * `small` exists for the topbar, where the avatar sits inside a control whose
 * height is set by the button scale. A 40px avatar in a 34px button is what made
 * the profile picture hang out of its own frame; the fix is an avatar that fits
 * the control, not a control stretched around the avatar.
 */
withDefaults(
  defineProps<{
    image?: string | null;
    label: string;
    size?: "small" | "normal" | "large" | "xlarge";
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

.base-avatar--small {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  font-size: var(--text-2xs);
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
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /*
   * The inline baseline gap is why an <img> in an inline-flex box can sit a
   * pixel proud of its own rounded corner. `display: block` removes it; the
   * radius is inherited through the parent's `overflow: hidden`.
   */
}
</style>
