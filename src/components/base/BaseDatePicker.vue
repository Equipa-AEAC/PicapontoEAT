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
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-sm);
  padding: 9px 14px;
  background: rgba(9, 15, 26, 0.72);
  color: var(--text-primary);
  color-scheme: dark;
}

.base-date-picker:focus {
  outline: none;
  border-color: rgba(122, 167, 255, 0.55);
}
</style>
