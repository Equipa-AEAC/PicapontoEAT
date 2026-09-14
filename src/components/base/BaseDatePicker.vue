<script setup lang="ts">
defineProps<{
  modelValue: string;
  min?: string;
  max?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<template>
  <input
    class="base-date-picker"
    type="date"
    :value="modelValue"
    :min="min"
    :max="max"
    :disabled="disabled"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>

<style scoped>
.base-date-picker {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 9px 14px;
  background: var(--input);
  color: var(--foreground);
  /*
   * No forced `color-scheme` here: the native calendar icon and popup take
   * their scheme from the inherited value on `:root` (light.css sets it to
   * `light`, the `[data-theme="dark"]` override sets it to `dark`). Hardcoding
   * `dark` here — a leftover from when this was the only theme — rendered the
   * calendar icon white-on-white and invisible in light mode.
   */
}

.base-date-picker:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}
</style>
