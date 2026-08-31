<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    type?: string;
    disabled?: boolean;
  }>(),
  {
    placeholder: undefined,
    type: "text",
    disabled: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<template>
  <input
    class="base-text-input"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>

<style scoped>
.base-text-input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  background: var(--input);
  color: var(--foreground);
}

.base-text-input::placeholder {
  color: var(--foreground-muted);
}

.base-text-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.base-text-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
