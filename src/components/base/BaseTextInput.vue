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
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  background: rgba(9, 15, 26, 0.72);
  color: var(--text-primary);
}

.base-text-input::placeholder {
  color: var(--text-muted);
}

.base-text-input:focus {
  outline: none;
  border-color: rgba(122, 167, 255, 0.55);
}

.base-text-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
